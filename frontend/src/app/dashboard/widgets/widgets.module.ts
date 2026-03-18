import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { NexusModule } from "@app/nx/nexus.module";
import { ApxChartXComponent } from "@charts/apx-chart-x/apx-chart-x.component";
import { NgbTooltipModule } from "@ng-bootstrap/ng-bootstrap";
import { ProgressBarComponent } from "@shards/progress-bar/progress-bar.component";
import { MoneyPipe } from "src/pipes/money.pipe";
import { MoneyShortPipe } from "src/pipes/mshort.pipe";
import { WidgetOptionsComponent } from "./widget-options/widget-options.component";
import { LineChartComponent } from "@charts/chart-card-base/chart-card-base.component";
import { LineChartRangeComponent } from "@charts/chart-card-base/chart-card-range.component";
import { UlCompactComponent } from "@shards/ul-compact/ul-compact.component";
import { RouterModule } from "@angular/router";
import { LoadingPipe } from "src/pipes/loading.pipe";
import { EmptyStateComponent } from "@shards/empty-state/empty-state.component";
import { NgxEchartsDirective } from "ngx-echarts";

const SHARED = [
    NexusModule, 
    MoneyShortPipe, 
    ProgressBarComponent, 
    CommonModule, 
    WidgetOptionsComponent, 
    MoneyPipe, 
    NgbTooltipModule, 
    ApxChartXComponent,
    LineChartComponent,
    LineChartRangeComponent,
    UlCompactComponent,
    RouterModule,
    LoadingPipe,
    EmptyStateComponent,
    NgxEchartsDirective
]
@NgModule({
    imports: SHARED,
    exports: SHARED
})
export class WidgetsModule { }