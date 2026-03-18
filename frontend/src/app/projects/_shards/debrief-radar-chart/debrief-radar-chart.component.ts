import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { CategoryBreakdown } from '@models/project/debrief.service'

@Component({
    selector: 'debrief-radar-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <canvas #canvas class="w-100" [style.height]="height"></canvas>
    `,
    styles: [`
        canvas {
            display: block;
        }
    `]
})
export class DebriefRadarChartComponent implements OnChanges, AfterViewInit {
    @Input() categories: CategoryBreakdown[] = []
    @Input() hideLegend: boolean = false
    @Input() height: string = '200px'

    @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>

    readonly #severityColors: Record<string, string> = {
        low: '#888888',
        medium: '#0A8BC9',
        high: '#FF6700',
        critical: '#F9001D'
    }

    // Radius ratios for each severity (0-1, from center)
    // 5 rings: 0-0.2 (empty), 0.2-0.4 (critical), 0.4-0.6 (high), 0.6-0.8 (medium), 0.8-1.0 (low)
    readonly #severityRadius: Record<string, number> = {
        critical: 0.3,
        high: 0.5,
        medium: 0.7,
        low: 0.9
    }

    readonly #defaultCategories = ['Customer', 'Process', 'Technical', 'Planning']

    ngAfterViewInit() {
        this.#draw()
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['categories'] && this.canvasRef) {
            this.#draw()
        }
    }

    #draw() {
        const canvas = this.canvasRef.nativeElement
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size based on container
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)

        const width = rect.width
        const height = rect.height
        const centerX = width / 2
        const centerY = height / 2
        const maxRadius = Math.min(width, height) / 2 - 30

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        // Get category names
        const categoryNames = this.categories.length > 0
            ? this.categories.map(c => c.category_name)
            : this.#defaultCategories
        const categoryCount = categoryNames.length
        const angleStep = (Math.PI * 2) / categoryCount

        // Draw concentric circles (5 rings)
        this.#drawRings(ctx, centerX, centerY, maxRadius)

        // Draw axis lines and labels
        this.#drawAxes(ctx, centerX, centerY, maxRadius, categoryNames, angleStep)

        // Draw problem points
        this.#drawPoints(ctx, centerX, centerY, maxRadius, categoryCount, angleStep)
    }

    #drawRings(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxRadius: number) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = 1

        for (let i = 1; i <= 5; i++) {
            const radius = (i / 5) * maxRadius
            ctx.beginPath()
            ctx.arc(cx, cy, radius, 0, Math.PI * 2)
            ctx.stroke()
        }
    }

    #drawAxes(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxRadius: number, categoryNames: string[], angleStep: number) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.lineWidth = 1
        ctx.fillStyle = '#adb5bd'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        categoryNames.forEach((name, index) => {
            // Angle: start from top (-PI/2) and go clockwise
            const angle = -Math.PI / 2 + index * angleStep

            // Draw axis line
            const endX = cx + Math.cos(angle) * maxRadius
            const endY = cy + Math.sin(angle) * maxRadius
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.lineTo(endX, endY)
            ctx.stroke()

            // Draw label
            const labelRadius = maxRadius + 15
            const labelX = cx + Math.cos(angle) * labelRadius
            const labelY = cy + Math.sin(angle) * labelRadius
            ctx.fillText(name, labelX, labelY)
        })
    }

    #drawPoints(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxRadius: number, categoryCount: number, angleStep: number) {
        this.categories.forEach((cat, categoryIndex) => {
            if (!cat.problems || cat.problems.length === 0) return

            // Base angle for this category (start from top, go clockwise)
            const baseAngle = -Math.PI / 2 + categoryIndex * angleStep

            // Group problems by severity
            const problemsBySeverity = new Map<string, { id: string, title: string }[]>()
            cat.problems.forEach(p => {
                const sev = p.severity || 'medium'
                if (!problemsBySeverity.has(sev)) {
                    problemsBySeverity.set(sev, [])
                }
                problemsBySeverity.get(sev)!.push({ id: p.id, title: p.title })
            })

            // Draw points for each severity
            problemsBySeverity.forEach((problems, severity) => {
                const baseRadiusRatio = this.#severityRadius[severity] || 0.7
                const color = this.#severityColors[severity] || '#888888'

                problems.forEach((problem, idx) => {
                    // Spread multiple points within the category segment
                    const spreadAngle = this.#calculateSpreadAngle(idx, problems.length, angleStep)
                    const angle = baseAngle + spreadAngle

                    // Add slight radius jitter for variety
                    const jitter = this.#seededRandom(categoryIndex * 100 + idx) * 0.08 - 0.04
                    const radiusRatio = baseRadiusRatio + jitter
                    const radius = radiusRatio * maxRadius

                    // Calculate point position
                    const x = cx + Math.cos(angle) * radius
                    const y = cy + Math.sin(angle) * radius

                    // Draw point
                    ctx.beginPath()
                    ctx.arc(x, y, 6, 0, Math.PI * 2)
                    ctx.fillStyle = color
                    ctx.fill()

                    // Add subtle shadow/glow
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
                    ctx.shadowBlur = 4
                    ctx.fill()
                    ctx.shadowBlur = 0
                })
            })
        })
    }

    #calculateSpreadAngle(index: number, total: number, maxAngle: number): number {
        if (total === 1) return 0

        const spreadRange = maxAngle * 0.5
        const step = spreadRange / (total + 1)
        return -spreadRange / 2 + step * (index + 1)
    }

    #seededRandom(seed: number): number {
        const x = Math.sin(seed * 9999) * 10000
        return x - Math.floor(x)
    }
}
