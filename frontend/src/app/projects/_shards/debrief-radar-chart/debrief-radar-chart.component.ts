import { Component, ElementRef, effect, input, viewChild } from '@angular/core'

import { CategoryBreakdown } from '@models/project/debrief.service'

@Component({
    selector: 'debrief-radar-chart',
    standalone: true,
    imports: [],
    template: `
        <canvas #canvas class="w-100" [style.height]="height()"></canvas>
    `,
    styles: [`
        canvas {
            display: block;
        }
    `]
})
export class DebriefRadarChartComponent {
    categories = input<CategoryBreakdown[]>([])
    hideLegend = input<boolean>(false)
    height = input<string>('200px')

    protected readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas')

    readonly #severityColors: Record<string, string> = {
        low: '#888888',
        medium: '#0A8BC9',
        high: '#FF6700',
        critical: '#F9001D'
    }

    readonly #severityRadius: Record<string, number> = {
        critical: 0.3,
        high: 0.5,
        medium: 0.7,
        low: 0.9
    }

    readonly #defaultCategories = ['Customer', 'Process', 'Technical', 'Planning']

    constructor() {
        effect(() => {
            this.categories()
            this.#draw()
        })
    }

    #draw() {
        const canvas = this.canvasRef().nativeElement
        const ctx = canvas.getContext('2d')
        if (!ctx) return

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

        ctx.clearRect(0, 0, width, height)

        const cats = this.categories()
        const categoryNames = cats.length > 0
            ? cats.map(c => c.category_name)
            : this.#defaultCategories
        const angleStep = (Math.PI * 2) / categoryNames.length

        this.#drawRings(ctx, centerX, centerY, maxRadius)
        this.#drawAxes(ctx, centerX, centerY, maxRadius, categoryNames, angleStep)
        this.#drawPoints(ctx, centerX, centerY, maxRadius, angleStep)
    }

    #drawRings(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxRadius: number) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = 1

        for (let i = 1; i <= 5; i++) {
            ctx.beginPath()
            ctx.arc(cx, cy, (i / 5) * maxRadius, 0, Math.PI * 2)
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
            const angle = -Math.PI / 2 + index * angleStep
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.lineTo(cx + Math.cos(angle) * maxRadius, cy + Math.sin(angle) * maxRadius)
            ctx.stroke()

            const labelRadius = maxRadius + 15
            ctx.fillText(name, cx + Math.cos(angle) * labelRadius, cy + Math.sin(angle) * labelRadius)
        })
    }

    #drawPoints(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxRadius: number, angleStep: number) {
        this.categories().forEach((cat, categoryIndex) => {
            if (!cat.problems?.length) return

            const baseAngle = -Math.PI / 2 + categoryIndex * angleStep
            const problemsBySeverity = new Map<string, { id: string, title: string }[]>()

            cat.problems.forEach(p => {
                const sev = p.severity || 'medium'
                if (!problemsBySeverity.has(sev)) problemsBySeverity.set(sev, [])
                problemsBySeverity.get(sev)!.push({ id: p.id, title: p.title })
            })

            problemsBySeverity.forEach((problems, severity) => {
                const baseRadiusRatio = this.#severityRadius[severity] ?? 0.7
                const color = this.#severityColors[severity] ?? '#888888'

                problems.forEach((_, idx) => {
                    const angle = baseAngle + this.#calculateSpreadAngle(idx, problems.length, angleStep)
                    const radiusRatio = baseRadiusRatio + this.#seededRandom(categoryIndex * 100 + idx) * 0.08 - 0.04
                    const x = cx + Math.cos(angle) * radiusRatio * maxRadius
                    const y = cy + Math.sin(angle) * radiusRatio * maxRadius

                    ctx.beginPath()
                    ctx.arc(x, y, 6, 0, Math.PI * 2)
                    ctx.fillStyle = color
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
