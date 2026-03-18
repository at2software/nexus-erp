import { Component, Input, Output, EventEmitter, ElementRef, OnInit, OnChanges, inject } from "@angular/core";
import { Company } from "src/models/company/company.model";
import { Connection } from "src/models/company/connection.model";
import { select, forceSimulation, forceManyBody, forceCenter, forceLink, drag, zoom, zoomIdentity, Simulation, } from 'd3';
import { NxGlobal } from "@app/nx/nx.global";

interface NetworkNode {
    id: string;
    name: string;
    group: number;
    net: number;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface NetworkLink {
    source: string | NetworkNode;
    target: string | NetworkNode;
    strength: number;
    projects_count: number;
}

@Component({
    selector: 'network-chart',
    template: '<div class="network-chart" style="height:100%;"></div>',
    host: { },
    styles: [':host { display: block; width: 100%; height: 100%; }'],
    standalone: true
})
export class NetworkChart implements OnInit, OnChanges {
    @Input() root?: Company;
    @Input() data: Connection[] = []
    @Input() focus?: string | Company | null;
    @Output() nodeSelected = new EventEmitter<string | null>();

    #nodes: NetworkNode[] = []
    #links: NetworkLink[] = []
    #simulation: Simulation<NetworkNode, NetworkLink>
    #svg: any
    //#activeNodeId: string | null = null
    #linkSelection: any
    #nodeSelection: any
    #chartElement: HTMLElement
    #container: any
    #zoomBehavior: any
    #isPanning: boolean = false
    #panStart: { x: number; y: number } = { x: 0, y: 0 }

    el: ElementRef = inject(ElementRef)

    ngOnInit() {
        this.#chartElement = this.el.nativeElement.querySelector('.network-chart')!;
        this.initSvg()
        this.initSimulation()
        this.updateData()
    }

    getNodeRadius(net: number): number {
        if (net === 0) return 5;
        return 5 + net;
    }

    getLinkColor(link: NetworkLink): string {
        const sourceNode = typeof link.source === 'object' ? link.source : this.#nodes.find(n => n.id === link.source);
        const targetNode = typeof link.target === 'object' ? link.target : this.#nodes.find(n => n.id === link.target);

        if (sourceNode && targetNode && (sourceNode.net === 0 || targetNode.net === 0)) {
            return '#333';
        }
        return '#999';
    }

    getLinkWidth(link: NetworkLink): number {
        if (link.projects_count === 0) return 1;
        const logWidth = 1 + Math.log(link.projects_count);
        return Math.min(Math.max(logWidth, 1), 5);
    }

    ngOnChanges(changes: any) {
        if ('data' in changes || 'root' in changes || 'focus' in changes) {
            if (this.#simulation) {
                this.updateData()
            }
        }
    }

    initSvg() {
        this.#svg = select(this.#chartElement).append('svg')
            .attr('width', '100%')
            .attr('height', '100%')

        // Create container group for zoom/pan
        this.#container = this.#svg.append('g');

        // Add zoom behavior
        this.#zoomBehavior = zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event: any) => {
                this.#container.attr('transform', event.transform);
            });

        this.#svg.call(this.#zoomBehavior);

        // Add middle-mouse button dragging
        this.#svg.on('mousedown', (event: MouseEvent) => {
            if (event.button === 1) {
                event.preventDefault();
                this.#isPanning = true;
                this.#panStart = { x: event.clientX, y: event.clientY };
            }
        });

        this.#svg.on('mousemove', (event: MouseEvent) => {
            if (this.#isPanning) {
                event.preventDefault();
                const dx = event.clientX - this.#panStart.x;
                const dy = event.clientY - this.#panStart.y;
                this.#panStart = { x: event.clientX, y: event.clientY };

                const currentTransform = this.#svg.node().__zoom || zoomIdentity;
                const newTransform = currentTransform.translate(dx / currentTransform.k, dy / currentTransform.k);
                this.#svg.call(this.#zoomBehavior.transform, newTransform);
            }
        });

        this.#svg.on('mouseup', (event: MouseEvent) => {
            if (event.button === 1) {
                this.#isPanning = false;
            }
        });

        this.#svg.on('mouseleave', () => {
            this.#isPanning = false;
        });

        this.#container.append('g').attr('class', 'links');
        this.#container.append('g').attr('class', 'nodes');

        const defs = this.#svg.append('defs');

        const filter = defs.append('filter')
            .attr('id', 'neumorphism-shadow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');

        filter.append('feDropShadow')
            .attr('dx', -3)
            .attr('dy', -3)
            .attr('stdDeviation', 3)
            .attr('flood-color', '#000')
            .attr('flood-opacity', 0.8);

        filter.append('feDropShadow')
            .attr('dx', 3)
            .attr('dy', 3)
            .attr('flood-color', '#fff')
            .attr('flood-opacity', 0.1);
    }

    initSimulation() {
        this.#simulation = forceSimulation<NetworkNode, NetworkLink>()
            .force('link', forceLink<NetworkNode, NetworkLink>().id((d: NetworkNode) => d.id))
            .force('charge', forceManyBody().strength(-1500))
            .force('center', forceCenter(this.#chartElement.clientWidth / 2, this.#chartElement.clientHeight / 2))
            .on('tick', () => {
                this.#nodeSelection.attr('transform', (d: NetworkNode) => `translate(${d.x},${d.y})`);
                this.#linkSelection
                    .attr('x1', (d: NetworkLink) => (d.source as NetworkNode).x!)
                    .attr('y1', (d: NetworkLink) => (d.source as NetworkNode).y!)
                    .attr('x2', (d: NetworkLink) => (d.target as NetworkNode).x!)
                    .attr('y2', (d: NetworkLink) => (d.target as NetworkNode).y!);
            });
    }

    updateData() {
        const oldNodesById = new Map(this.#nodes.map(n => [n.id, n]));
        const newNodes: NetworkNode[] = [];

        // Normalize ID to string
        const normalizeId = (id: any): string => String(id);

        // Calculate focus ID once for the entire method
        const focusId = typeof this.focus === 'string' ? this.focus : this.focus?.id ? String(this.focus.id) : null;

        if (this.root) {
            // Single-root mode: show connections for one company
            const rootId = normalizeId(this.root.id);

            // Get root company net from connections (already obfuscated)
            let rootNet = 0;
            if (this.data.length > 0) {
                const firstConn = this.data[0];
                if (String(firstConn.company1_id) === rootId) {
                    rootNet = firstConn.company1?.net || 0;
                } else if (String(firstConn.company2_id) === rootId) {
                    rootNet = firstConn.company2?.net || 0;
                }
            }

            const rootNode = oldNodesById.get(rootId) || { id: rootId, name: this.root.name, group: 0, net: rootNet };
            newNodes.push(rootNode);

            this.data.forEach(conn => {
                const other = conn.otherCompany(this.root!);
                if (!other) return;
                const otherId = normalizeId(other.id);
                const existingNode = oldNodesById.get(otherId) || { id: otherId, name: other.name, group: 1, net: other.net || 0 };
                newNodes.push(existingNode);
            });
        } else {
            // Full-network mode: show all companies and connections
            const companyMap = new Map<string, NetworkNode>();

            this.data.forEach(conn => {
                const id1 = normalizeId(conn.company1_id);
                const id2 = normalizeId(conn.company2_id);

                if (!companyMap.has(id1) && conn.company1) {
                    const existingNode = oldNodesById.get(id1);
                    companyMap.set(id1, existingNode || {
                        id: id1,
                        name: conn.company1.name,
                        group: 1,
                        net: conn.company1.net || 0
                    });
                }
                if (!companyMap.has(id2) && conn.company2) {
                    const existingNode = oldNodesById.get(id2);
                    companyMap.set(id2, existingNode || {
                        id: id2,
                        name: conn.company2.name,
                        group: 1,
                        net: conn.company2.net || 0
                    });
                }
            });

            newNodes.push(...companyMap.values());
        }

        // Build node ID set for validation
        const nodeIdSet = new Set(newNodes.map(n => n.id));

        // Calculate link strength based on projects_count
        // More projects = stronger link = nodes pulled closer together
        const newLinks: NetworkLink[] = [];

        this.data.forEach(conn => {
            // Skip connections where we don't have both companies loaded
            if (!conn.company1 || !conn.company2) return;

            const projectsCount = conn.projects_count || 0;
            let strength = 1 + (projectsCount * 0.5);

            const id1 = normalizeId(conn.company1_id);
            const id2 = normalizeId(conn.company2_id);
            const rootId = this.root ? normalizeId(this.root.id) : null;
            const meId = NxGlobal.ME_ID ? String(NxGlobal.ME_ID) : null;

            // Increase strength based on revenue score if one company is ME_ID
            if (meId && (id1 === meId || id2 === meId)) {
                const otherCompany = id1 === meId ? conn.company2 : conn.company1;
                const revenueScore = otherCompany?.net || 0;
                if (revenueScore > 0) {
                    strength += revenueScore * 0.05;
                }
            }

            const sourceId = rootId && id1 === rootId ? rootId : id1;
            const targetId = rootId && id2 === rootId ? rootId : id2;

            // Only add link if both nodes exist
            if (nodeIdSet.has(sourceId) && nodeIdSet.has(targetId)) {
                newLinks.push({
                    source: sourceId,
                    target: targetId,
                    strength: strength,
                    projects_count: projectsCount
                });
            }
        });

        // Preserve node positions and pinned state
        const centerX = this.#chartElement.clientWidth / 2;
        const centerY = this.#chartElement.clientHeight / 2;

        newNodes.forEach(n => {
            const oldNode = oldNodesById.get(n.id);
            if (oldNode) {
                n.x = oldNode.x;
                n.y = oldNode.y;
                n.fx = oldNode.fx;
                n.fy = oldNode.fy;
            }

            // Pin focus node to center
            if (focusId && n.id === focusId) {
                n.fx = centerX;
                n.fy = centerY;
            }
        });

        this.#nodes = newNodes;
        this.#links = newLinks;

        this.#simulation.nodes(this.#nodes);

        const linkForce = this.#simulation.force('link') as any;
        if (linkForce) {
            linkForce.links(this.#links);
            linkForce.strength((d: NetworkLink) => d.strength);
        }

        this.#linkSelection = this.#container.select('g.links')
            .selectAll('line')
            .data(this.#links, (d: NetworkLink) => {
                const source = typeof d.source === 'object' ? d.source.id : d.source;
                const target = typeof d.target === 'object' ? d.target.id : d.target;
                return `${source}-${target}`;
            });

        this.#linkSelection.exit().remove();

        const linkEnter = this.#linkSelection.enter().append('line')
            .attr('stroke', (d: NetworkLink) => this.getLinkColor(d))
            .attr('stroke-opacity', 1)
            .attr('stroke-width', (d: NetworkLink) => this.getLinkWidth(d))
            .attr('class', 'network-link');

        this.#linkSelection = linkEnter.merge(this.#linkSelection);

        // Update existing links
        this.#linkSelection
            .attr('stroke', (d: NetworkLink) => this.getLinkColor(d))
            .attr('stroke-width', (d: NetworkLink) => this.getLinkWidth(d));

        this.#nodeSelection = this.#container.select('g.nodes')
            .selectAll('g')
            .data(this.#nodes, (d: NetworkNode) => d.id);

        this.#nodeSelection.exit().remove();

        const nodeEnter = this.#nodeSelection.enter().append('g')
            .call(
                drag<SVGGElement, NetworkNode>()
                    .on('start', (event: any, d: NetworkNode) => this.dragstarted(event, d))
                    .on('drag', (event: any, d: NetworkNode) => this.dragged(event, d))
                    .on('end', (event: any, d: NetworkNode) => this.dragended(event, d))
            )
            .on('click', (event: any, d: NetworkNode) => this.togglePin(event, d));

        nodeEnter.append('circle')
            .attr('r', (n: NetworkNode) => this.getNodeRadius(n.net))
            .style('fill', (n: NetworkNode) => {
                const meId = NxGlobal.ME_ID ? String(NxGlobal.ME_ID) : null;
                if (meId && n.id === meId) return '#28a745';
                if (n.net === 0) return '#666';
                return n.group == 0 ? 'var(--color-primary-0)' : 'white';
            })
            .style('filter', 'url(#neumorphism-shadow)')
            .style('cursor', 'pointer')

        nodeEnter.append('title')
            .text((d: NetworkNode) => d.name)

        nodeEnter.append('text')
            .attr('x', (d: NetworkNode) => this.getNodeRadius(d.net) + 10)
            .attr('y', 5)
            .attr('fill', 'white')
            .style('font-size', '10px')
            .style('cursor', 'pointer')
            .style('display', (d: NetworkNode) => d.net === 0 ? 'none' : 'block')
            .text((d: NetworkNode) => d.name)

        this.#nodeSelection = nodeEnter.merge(this.#nodeSelection)

        // Update circle radius, color, and pinned state
        this.#nodeSelection.select('circle')
            .attr('r', (n: NetworkNode) => this.getNodeRadius(n.net))
            .style('fill', (n: NetworkNode) => {
                const meId = NxGlobal.ME_ID ? String(NxGlobal.ME_ID) : null;
                if (meId && n.id === meId) return '#28a745';
                if (n.net === 0) return '#666';
                return n.group == 0 ? 'var(--color-primary-0)' : 'white';
            })
            .style('stroke', (d: NetworkNode) => {
                if (focusId && d.id === focusId) return 'var(--color-primary-0)';
                return d.fx !== null && d.fx !== undefined ? 'var(--color-primary-0)' : 'none';
            })
            .style('stroke-width', (d: NetworkNode) => {
                if (focusId && d.id === focusId) return 3;
                return d.fx !== null && d.fx !== undefined ? 2 : 0;
            });

        // Update text position and visibility based on net
        this.#nodeSelection.select('text')
            .attr('x', (d: NetworkNode) => this.getNodeRadius(d.net) + 10)
            .style('display', (d: NetworkNode) => d.net === 0 ? 'none' : 'block');

        this.#simulation.alpha(1).restart()
    }

    highlightConnectedLinks(nodeId: string) {
        this.#linkSelection
            .attr('stroke', (d: NetworkLink) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                return (sourceId === nodeId || targetId === nodeId) ? 'var(--color-primary-0)' : this.getLinkColor(d);
            })
            .attr('stroke-width', (d: NetworkLink) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                return (sourceId === nodeId || targetId === nodeId) ? this.getLinkWidth(d) + 1 : this.getLinkWidth(d);
            });
    }

    resetLinkHighlight() {
        this.#linkSelection
            .attr('stroke', (d: NetworkLink) => this.getLinkColor(d))
            .attr('stroke-width', (d: NetworkLink) => this.getLinkWidth(d));
    }

    dragstarted(event: any, d: NetworkNode) {
        if (!event.active) this.#simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        this.highlightConnectedLinks(d.id);
    }

    dragged(event: any, d: NetworkNode) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event: any, d: NetworkNode) {
        if (!event.active) this.#simulation.alphaTarget(0);

        // Emit node selection when drag ends with node pinned
        if (d.fx !== null && d.fx !== undefined) {
            this.nodeSelected.emit(d.id);
        } else {
            this.resetLinkHighlight();
            this.nodeSelected.emit(null);
        }

        // Update stroke to show pinned state
        this.#nodeSelection.select('circle')
            .style('stroke', (n: NetworkNode) => {
                const focusId = typeof this.focus === 'string' ? this.focus : this.focus?.id ? String(this.focus.id) : null;
                if (focusId && n.id === focusId) return 'var(--color-primary-0)';
                return n.fx !== null && n.fx !== undefined ? 'var(--color-primary-0)' : 'none';
            })
            .style('stroke-width', (n: NetworkNode) => {
                const focusId = typeof this.focus === 'string' ? this.focus : this.focus?.id ? String(this.focus.id) : null;
                if (focusId && n.id === focusId) return 3;
                return n.fx !== null && n.fx !== undefined ? 2 : 0;
            });
    }

    togglePin(event: any, d: NetworkNode) {
        event.stopPropagation();

        if (d.fx !== null && d.fx !== undefined) {
            d.fx = null;
            d.fy = null;
            this.resetLinkHighlight();
            this.nodeSelected.emit(null);
        } else {
            d.fx = d.x;
            d.fy = d.y;
            this.highlightConnectedLinks(d.id);
            this.nodeSelected.emit(d.id);
        }

        this.#nodeSelection.select('circle')
            .style('stroke', (n: NetworkNode) => n.fx !== null && n.fx !== undefined ? 'var(--color-primary-0)' : 'none')
            .style('stroke-width', (n: NetworkNode) => n.fx !== null && n.fx !== undefined ? 2 : 0);

        this.#simulation.alpha(0.3).restart();
    }
}
