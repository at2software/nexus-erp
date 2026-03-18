export const chartTooltipHideEvent = {
        mouseLeave: () => {
            const tooltipEl = document.querySelector('.apexcharts-tooltip');
            if (tooltipEl) {
                (tooltipEl as HTMLElement).style.opacity = '0';
                (tooltipEl as HTMLElement).style.pointerEvents = 'none';
            }
        }
    }