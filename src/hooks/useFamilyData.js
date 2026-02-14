import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const DUMMY_DATA = {
    nodes: [
        { id: 'dummy-me', name: 'You (Add someone!)', role: 'me', life_status: 'living', type: 'human' },
        { id: 'dummy-father', name: 'Father (Example)', role: 'parent', life_status: 'living', type: 'human' },
        { id: 'dummy-mother', name: 'Mother (Example)', role: 'parent', life_status: 'living', type: 'human' }
    ],
    links: [
        { id: 'dummy-l1', source: 'dummy-father', target: 'dummy-me', type: 'parent_child', strength: 1.2 },
        { id: 'dummy-l2', source: 'dummy-mother', target: 'dummy-me', type: 'parent_child', strength: 1.2 },
        { id: 'dummy-l3', source: 'dummy-father', target: 'dummy-mother', type: 'spouse', strength: 1.5 }
    ]
}

export function useFamilyData() {
    const [profiles, setProfiles] = useState([])
    const [relationships, setRelationships] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchData()

        // Realtime subscriptions
        const profilesSubscription = supabase
            .channel('public:profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchData)
            .subscribe()

        const relationshipsSubscription = supabase
            .channel('public:relationships')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'relationships' }, fetchData)
            .subscribe()

        return () => {
            supabase.removeChannel(profilesSubscription)
            supabase.removeChannel(relationshipsSubscription)
        }
    }, [])

    async function fetchData() {
        try {
            // setLoading(true) // Don't block UI on background updates
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')

            if (profilesError) throw profilesError

            const { data: relationshipsData, error: relationshipsError } = await supabase
                .from('relationships')
                .select('*')

            if (relationshipsError) throw relationshipsError

            setProfiles(profilesData || [])
            setRelationships(relationshipsData || [])
        } catch (err) {
            console.error('Error fetching data:', err)
            setError(err)
        } finally {
            setLoading(false)
        }
    }

    async function addProfile(profile, relationshipData) {
        // 1. Insert Profile
        const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert([profile])
            .select()
            .single()

        if (profileError) throw profileError

        // 2. Insert Relationship if specified
        if (relationshipData && relationshipData.targetId) {
            const { targetId, type } = relationshipData

            // Define relationship strength/type logic
            let relType = 'parent_child' // Default
            let strength = 1.0

            if (type === 'spouse') { relType = 'spouse'; strength = 1.5; }
            if (type === 'child') { relType = 'parent_child'; strength = 1.2; } // target is parent
            if (type === 'parent') { relType = 'parent_child'; strength = 1.2; } // new profile is parent
            if (type === 'sibling') { relType = 'sibling'; strength = 1.0; }
            if (type === 'pet') { relType = 'pet_owner'; strength = 0.8; }
            if (type === 'grandparent') { relType = 'grandparent_grandchild'; strength = 0.5; }

            // Determine source/target based on semantics
            // Default: Source = New Profile, Target = Existing Profile
            let source = newProfile.id
            let target = targetId

            // Swap if "Child" type selected (meaning New Profile is Child of Existing Target)
            // Actually 'parent_child' relation usually implies Source=Parent, Target=Child
            if (type === 'child') {
                source = targetId // Parent
                target = newProfile.id // Child
            } else if (type === 'parent') {
                source = newProfile.id // Parent
                target = targetId // Child
            }

            const { error: relError } = await supabase
                .from('relationships')
                .insert([{
                    source_id: source,
                    target_id: target,
                    type: relType,
                    strength: strength
                }])

            if (relError) console.error('Error creating relationship:', relError)
        }

        return newProfile
    }

    // Helper to construct graph data (nodes and links)
    const graphData = profiles.length > 0 ? {
        nodes: profiles.map(p => ({ ...p, id: p.id })), // Ensure shallow copy for D3
        links: relationships.map(r => ({ ...r, source: r.source_id, target: r.target_id }))
    } : DUMMY_DATA

    return { profiles, relationships, graphData, loading, error, addProfile }
}
