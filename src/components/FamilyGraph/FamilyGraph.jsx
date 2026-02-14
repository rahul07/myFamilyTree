import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './FamilyGraph.css'

const FamilyGraph = ({ nodes, links, settings }) => {
    const svgRef = useRef(null)
    const simulationRef = useRef(null)

    // apply theme to body logic
    useEffect(() => {
        const root = document.documentElement;
        // Default Midnight
        let bgDeep = '#0f172a';
        let textPrimary = '#f8fafc';
        let accentPrimary = '#38bdf8';
        let bgGradient = 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)';

        if (settings?.theme === 'ivory') {
            bgDeep = '#fdfbf7';
            textPrimary = '#1e293b';
            accentPrimary = '#0ea5e9';
            bgGradient = 'radial-gradient(circle at 50% 50%, #ffffff 0%, #f1f5f9 100%)';
        } else if (settings?.theme === 'parchment') {
            bgDeep = '#f5e6d3';
            textPrimary = '#4a3b2a';
            accentPrimary = '#d97706';
            bgGradient = 'radial-gradient(circle at 50% 50%, #faebd7 0%, #deb887 100%)';
        }

        root.style.setProperty('--color-bg-deep', bgDeep);
        root.style.setProperty('--color-text-primary', textPrimary);
        root.style.setProperty('--color-accent-primary', accentPrimary);
        // We might need to update app-container background directly or via var
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.style.background = bgGradient;

    }, [settings?.theme])

    useEffect(() => {
        if (!svgRef.current) return

        const width = window.innerWidth
        const height = window.innerHeight

        // Clear previous graph
        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove()

        // Define Gradients and Filters
        const defs = svg.append('defs')

        // Subtle Glow
        const filter = defs.append('filter')
            .attr('id', 'soft-glow')
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '2')
            .attr('result', 'coloredBlur')
        const feMerge = filter.append('feMerge')
        feMerge.append('feMergeNode').attr('in', 'coloredBlur')
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

        // Hexagon Path function
        const hexPath = (r) => {
            // q = r * 2/sqrt(3) roughly r * 1.15
            // But let's just draw points
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                points.push([r * Math.cos(angle), r * Math.sin(angle)]);
            }
            return 'M' + points.map(p => p.join(',')).join('L') + 'Z';
        }

        // Find "Me" node
        const meNode = nodes.find(n => n.role === 'me')
        if (meNode) {
            meNode.fx = width / 2
            meNode.fy = height / 2
        }

        // Initialize Simulation Data with Auto-Siblings
        let graphLinks = [...links];

        // 1. Identify Siblings (Nodes sharing a parent)
        const parentMap = {}; // parentId -> [childIds]
        links.forEach(l => {
            // Assuming relationship direction: Source = Parent, Target = Child for 'parent_child' type?
            // Actually our data might be mixed. Let's check typical structure.
            // Usually we have type 'parent_of' or similar. 
            // Let's assume standard: source=parent, target=child OR check roles.
            // Safe bet: Group by parent.
            if (l.type === 'parent_child' || l.type === 'parent') { // Check explicit types used
                if (!parentMap[l.source.id]) parentMap[l.source.id] = [];
                parentMap[l.source.id].push(l.target.id);
            }
        });

        // Also check reverse if needed, but let's stick to the graph structure passed.
        // Actually, D3 modifies links to be objects. We need to be careful if we are modifying props.
        // We cloned props in App.jsx so we are safe to mutate 'links' array locally if needed,
        // but 'links' here contains objects if D3 ran before? No, strict mode re-runs.
        // Let's rely on raw IDs if possible or handle objects.

        // BETTER APPROACH:
        // We need to generate these links BEFORE d3.forceLink processes them.

        // Let's do a quick pass on raw links to find shared parents.
        // We need to know which link is parent->child.
        // In our DB/App logic: 
        // If Role is Parent -> Child.
        // Let's iterate nodes to find children of same parents.
        // Actually simplest is: If multiple nodes are targets of the same source (parent), they are siblings.

        const parentToChildren = {};
        links.forEach(l => {
            // We need to handle both object (after d3 run) and string (initial) formats to be robust
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;

            // We'll rely on our known types. 
            // If we don't have explicit 'parent' type, we might guess.
            // But we do: relationships have types.
            // Let's just look for shared connections.
            if (l.type === 'parent' || l.type === 'parent_child') {
                if (!parentToChildren[sourceId]) parentToChildren[sourceId] = [];
                parentToChildren[sourceId].push(targetId);
            }
        });

        // Generate Sibling Links
        Object.values(parentToChildren).forEach(children => {
            if (children.length > 1) {
                for (let i = 0; i < children.length; i++) {
                    for (let j = i + 1; j < children.length; j++) {
                        // Check if link already exists
                        const exists = graphLinks.some(l =>
                            (l.source.id === children[i] && l.target.id === children[j]) ||
                            (l.source === children[i] && l.target === children[j]) || // Raw IDs
                            (l.source.id === children[j] && l.target.id === children[i]) ||
                            (l.source === children[j] && l.target === children[i])
                        );

                        if (!exists) {
                            graphLinks.push({
                                source: children[i],
                                target: children[j],
                                type: 'sibling_inferred',
                                id: `inferred-${children[i]}-${children[j]}`
                            });
                        }
                    }
                }
            }
        });

        // Initialize Simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(graphLinks).id(d => d.id).distance(d => {
                if (d.type === 'spouse') return 60; // Keep spouses close
                if (d.type === 'sibling' || d.type === 'sibling_inferred') return 180; // Separate siblings
                return 120; // Parent-child default
            }))
            .force('charge', d3.forceManyBody().strength(-1000)) // Stronger repulsion
            .force('collide', d3.forceCollide().radius(70)) // Larger collision radius

        // Apply Forces based on Layout Settings
        if (settings && settings.layout === 'tree') {
            simulation.force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
            simulation.force('y', d3.forceY().y(d => {
                // Ancestors on Top (Low Y)
                if (d.role === 'great_grandparent') return height * 0.1;
                if (d.role === 'grandparent') return height * 0.2;
                if (d.role === 'parent') return height * 0.35;

                // Me/Spouse/Siblings/Pets in Middle
                if (['me', 'spouse', 'sibling', 'pet'].includes(d.role)) return height * 0.55;

                // Descendants at Bottom (High Y)
                if (d.role === 'child') return height * 0.8;

                return height * 0.5;
            }).strength(1))
        } else {
            // Organic Layout
            simulation.force('center', d3.forceCenter(width / 2, height / 2).strength(meNode ? 0.05 : 0.8))
        }

        simulationRef.current = simulation

        // Link Group
        const linkGroup = svg.append('g').attr('class', 'links')

        // Draw Links
        const link = linkGroup.selectAll('path')
            .data(graphLinks) // Use enhanced links
            .join('path')
            .attr('fill', 'none')
            // BOLD STYLE UPDATE
            .attr('stroke-width', d => {
                if (d.type === 'spouse') return 3; // Thicker
                if (d.type === 'sibling' || d.type === 'sibling_inferred') return 2;
                return 1.5; // Base thickness increased
            })
            .attr('stroke', d => {
                if (d.type === 'spouse') return 'var(--color-gold)';
                if (d.type === 'sibling' || d.type === 'sibling_inferred') return 'var(--color-accent-primary)'; // Visible sibling links
                return 'var(--color-text-secondary)';
            })
            .attr('stroke-opacity', d => {
                if (d.type === 'sibling_inferred') return 0.6;
                return 0.8; // Much more visible
            })
            .attr('stroke-dasharray', d => (d.type === 'sibling' || d.type === 'sibling_inferred') ? '4,4' : '')
            .style('transition', 'all 0.3s ease')

        // Particles
        if (settings?.particles) {
            // Simple particle system: circles moving along links? 
            // Or just ambient background particles?
            // Let's do ambient background particles for atmosphere
            const particleCount = 20;
            const particles = d3.range(particleCount).map(() => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1
            }));

            svg.append('g').attr('class', 'particles')
                .selectAll('circle')
                .data(particles)
                .join('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y)
                .attr('r', d => d.size)
                .attr('fill', 'var(--color-accent-primary)')
                .attr('opacity', 0.3)
                .attr('class', 'particle-anim') // CSS animation handle
        }

        // Draw Nodes
        const node = svg.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))

        // Node Group
        const nodeGroup = node.append('g').attr('class', 'node-group')

        // Node Shape Logic
        const isHex = settings?.nodeShape === 'hexagon';
        const nodeSize = (d) => d.type === 'pet' ? 25 : 35;

        // Border
        if (isHex) {
            nodeGroup.append('path')
                .attr('d', d => hexPath(nodeSize(d)))
                .attr('fill', 'var(--color-bg-deep)')
                .attr('stroke', d => {
                    if (d.role === 'me') return '#fff';
                    if (d.type === 'pet') return 'var(--color-gold)';
                    if (['parent', 'grandparent', 'great_grandparent'].includes(d.role)) return 'var(--color-accent-secondary)';
                    return 'var(--color-accent-primary)';
                })
                .attr('stroke-width', 2)
                .style('filter', d => d.role === 'me' ? 'url(#soft-glow)' : 'none')
        } else {
            // Circle
            nodeGroup.append('circle')
                .attr('r', d => nodeSize(d))
                .attr('fill', 'var(--color-bg-deep)')
                .attr('stroke', d => {
                    if (d.role === 'me') return '#fff';
                    if (d.type === 'pet') return 'var(--color-gold)';
                    if (['parent', 'grandparent', 'great_grandparent'].includes(d.role)) return 'var(--color-accent-secondary)';
                    return 'var(--color-accent-primary)';
                })
                .attr('stroke-width', 2)
                .style('filter', d => d.role === 'me' ? 'url(#soft-glow)' : 'none')
        }

        // Clip Path
        const clipId = (d) => `clip-${d.id}`
        const clipPath = nodeGroup.append('clipPath').attr('id', d => clipId(d));

        if (isHex) {
            clipPath.append('path').attr('d', d => hexPath(nodeSize(d)));
        } else {
            clipPath.append('circle').attr('r', d => nodeSize(d));
        }

        // Image
        nodeGroup.append('image')
            .attr('xlink:href', d => d.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.name}`)
            .attr('x', d => -nodeSize(d))
            .attr('y', d => -nodeSize(d))
            .attr('width', d => nodeSize(d) * 2)
            .attr('height', d => nodeSize(d) * 2)
            .attr('clip-path', d => `url(#${clipId(d)})`)
            .attr('preserveAspectRatio', 'xMidYMid slice')

        // Minimal Label (Name Only)
        nodeGroup.append('text')
            .text(d => d.name.split(' ')[0])
            .attr('text-anchor', 'middle')
            .attr('y', d => d.type === 'pet' ? 40 : 52)
            .attr('fill', 'var(--color-text-primary)') // Use var for theme support
            .style('font-size', '11px')
            .style('font-family', 'var(--font-sans)')
            .style('font-weight', '400')
            .style('letter-spacing', '0.5px')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 2px 4px rgba(0,0,0,0.5)')

        simulation.on('tick', () => {
            // Apply Link Style
            link.attr('d', d => {
                if (settings && settings.linkStyle === 'straight') {
                    return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
                }
                // Curved
                const dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });

            node.attr('transform', d => `translate(${d.x},${d.y})`)

            // Particle Movement (Simple drift)
            if (settings?.particles) {
                svg.selectAll('.particles circle')
                    .attr('cx', function (d) {
                        d.x += d.vx;
                        if (d.x > width) d.x = 0;
                        if (d.x < 0) d.x = width;
                        return d.x;
                    })
                    .attr('cy', function (d) {
                        d.y += d.vy;
                        if (d.y > height) d.y = 0;
                        if (d.y < 0) d.y = height;
                        return d.y;
                    })
            }
        })

        // Drag Functions
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            event.subject.fx = event.subject.x
            event.subject.fy = event.subject.y
        }
        function dragged(event) {
            event.subject.fx = event.x
            event.subject.fy = event.y
        }
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0)
            if (event.subject.role !== 'me') {
                event.subject.fx = null
                event.subject.fy = null
            }
        }

        return () => simulation.stop()
    }, [nodes, links, settings])

    return (
        <svg
            ref={svgRef}
            className="family-graph"
            viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        ></svg>
    )
}

export default FamilyGraph
