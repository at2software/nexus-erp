<?php

use Illuminate\Support\Facades\Route;

// Static sysinfo route - no dependencies loaded
Route::get('sysinfo', function () {
    return response()->json([
        'version'    => 0.8,
        'method'     => config('app.auth_method'),
        'reverb_key' => env('REVERB_APP_KEY', 'nexus-key'),
    ])->header('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
});

Route::post('login', \App\Http\Controllers\UserController::class.'@login');
Route::get('companies/{_}/icon', fn (\App\Models\Company $_) => $_->image());
Route::get('projects/{_}/icon', fn (\App\Models\Project $_) => $_->company->image());
Route::get('users/{_}/icon', fn (\App\Models\User $_) => $_->image());
Route::get('users/{_}/mailicon', fn (string $_) => \App\Models\User::findOrFail('email', $_)->image());    // for timetracker
Route::get('neuron/icon', \App\Http\Controllers\NexusController::class.'@icon');
Route::get('qr', \App\Http\Controllers\WidgetController::class.'@getQrCode');
Route::middleware('apikey:X-Auth-Token,'.env('TEAM_MONITOR_API_KEY', ''))->get('/team-monitor', \App\Http\Controllers\StatsController::class.'@apiTeamMonitor');
Route::post('at2-connect/init-support-thread', \App\Http\Controllers\At2ConnectController::class.'@initSupportThread');

Route::match(['GET', 'PROPFIND', 'OPTIONS', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'REPORT'], '/carddav/{path?}', [\App\Http\Controllers\CardDAVController::class, 'handleCardDAV'])->where('path', '.*')->middleware(\App\Http\Middleware\WebDAVAuthMiddleware::class)->name('/backend/api/carddav');
Route::match(['GET', 'PROPFIND', 'OPTIONS', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'REPORT'], '/caldav/{path?}', [\App\Http\Controllers\CalDAVController::class, 'handleCalDAV'])->where('path', '.*')->middleware(\App\Http\Middleware\WebDAVAuthMiddleware::class)->name('/backend/api/caldav');

Route::middleware('auth', 'release.session', 'cache.headers:no_cache;must_revalidate')->group(function () {
    Route::post('search', \App\Http\Controllers\SearchController::class.'@search');
    Route::post('populate-clipboard', \App\Http\Controllers\NexusController::class.'@populateClipboard');

    Route::prefix('cash')->group(function () {
        Route::get('', \App\Http\Controllers\CashController::class.'@indexRegisters');
        Route::get('{_}', \App\Http\Controllers\CashController::class.'@indexEntries');
        Route::post('{_}', \App\Http\Controllers\CashController::class.'@storeEntry');
        Route::delete('entries/{_}', \App\Http\Controllers\CashController::class.'@destroyEntry');
    })->middleware('role:admin|financial');

    Route::prefix('comments')->group(function () {});

    Route::prefix('commands')->controller(\App\Http\Controllers\CommandController::class)->middleware('role:admin')->group(function () {
        Route::get('', 'index');
        Route::post('execute', 'execute');
        Route::get('{command}', 'show');
    });

    Route::prefix('cors')->group(function () {
        Route::post('', \App\Http\Controllers\CorsController::class.'@curl');
        Route::prefix('{id}')->group(function () {
            Route::post('', \App\Http\Controllers\CorsController::class.'@curlId');
        });
    });

    Route::prefix('companies')->middleware('role:admin|user|project_manager|marketing')->group(function () {
        Route::get('support', \App\Http\Controllers\CompanyController::class.'@indexUnbilledFoci');
        Route::get('with-coordinates', \App\Http\Controllers\CompanyController::class.'@indexWithCoordinates');
        Route::get('{_}/projects', \App\Http\Controllers\ProjectController::class.'@indexForCompany');
        Route::get('{_}/co-participated-projects', \App\Http\Controllers\ProjectController::class.'@indexCoParticipatedProjects');
        Route::get('by-phone', \App\Http\Controllers\CompanyController::class.'@showByPhone');

        Route::get('stats', \App\Http\Controllers\InvoiceController::class.'@getCustomerStats');

        Route::prefix('maintenance')->controller(\App\Http\Controllers\CompanyController::class)->group(function () {
            Route::get('commercial-register', 'maintenanceCommercialRegister');
        });
        Route::prefix('{_}')->controller(\App\Http\Controllers\CompanyController::class)->group(function () {
            Route::get('assignees', 'indexAssignees');
            Route::post('assignees', 'storeAssignee');
            Route::get('comments', 'indexComments');
            Route::get('connections', 'indexConnections');
            Route::get('employees', 'indexEmployees');
            Route::post('employees', 'storeEmployee');
            Route::get('foci', 'indexFoci');
            Route::get('import_imprint', 'importImprint');
            Route::get('invoice', 'makeInvoice');
            Route::put('activate-repeating-items', 'updateActivateRepeatingItems');
            Route::middleware('role:admin|invoicing')->group(function () {
                Route::get('invoice-items', 'indexInvoiceItems');
                Route::get('support-items', 'indexSupportItems');
            });
        })->whereNumber('_');
        Route::prefix('{_}')->group(function () {
            Route::post('avatar', \App\Http\Controllers\FileController::class.'@storeCompanyAvatar');
            Route::post('media', \App\Http\Controllers\FileController::class.'@uploadCompanyMedia');
            Route::post('projects', fn (\App\Models\Company $_) => $_->createProject());
            Route::get('stats', fn (\App\Models\Company $_) => $_->stats());
        })->whereNumber('_');
        \App\Http\Controllers\ParamController::getRoute(\App\Models\Company::class);
    });
    Route::prefix('company_contacts')->controller(\App\Http\Controllers\CompanyContactController::class)->group(function () {
        Route::prefix('{_}')->group(function () {});
    });

    Route::prefix('connections')->middleware('role:admin|user|project_manager|marketing')->group(function () {
        Route::get('/', \App\Http\Controllers\CompanyController::class.'@indexAllConnections');
        Route::post('/', \App\Http\Controllers\CompanyController::class.'@storeConnection');
        Route::delete('/{_}', fn (\App\Models\Connection $_) => $_->delete());
    });

    Route::prefix('contacts')->middleware('role:admin|user|project_manager|marketing')->group(function () {
        Route::prefix('{_}')->group(function () {
            Route::get('at2-connect-qr', fn (\App\Models\Contact $_) => $_->getQrCodeAttribute());
            Route::get('at2-connect-url', fn (\App\Models\Contact $_) => $_->getAt2ConnectUrlAttribute());
            Route::post('at2-connect-token', fn (\App\Models\Contact $_) => $_->createAt2ConnectToken());
            Route::delete('at2-connect-token', fn (\App\Models\Contact $_) => $_->deleteAt2ConnectToken());
            Route::put('add-linkedin', \App\Http\Controllers\ContactController::class.'@updateAddLinkedIn');
            Route::put('unlink/{company}', \App\Http\Controllers\ContactController::class.'@unlink');
        });

        Route::prefix('maintenance')->controller(\App\Http\Controllers\ContactController::class)->group(function () {
            Route::get('birthdays', 'maintenanceMissingBirthday');
        });
    });

    Route::prefix('expenses')->middleware('role:admin|financial')->group(function () {
        Route::get('/categories', fn () => \App\Models\ExpenseCategory::all());
    });

    Route::prefix('foci')->middleware('role:admin|hr|project_manager')->group(function () {
        Route::get('/uninvoiced/{path}/{id}', fn (string $path, string $id) => \App\Models\Focus::fromPath($path.'/'.$id)->foci_unbilled()->get());
        Route::post('/create-items/{path}/{id}', fn (string $path, string $id) => \App\Models\Focus::fromPath($path.'/'.$id)->createInvoiceItemsFromFoci());
    });

    Route::prefix('live-sharing')->controller(\App\Http\Controllers\LiveSharingController::class)->group(function () {
        Route::post('toggle', 'toggleSharing');
        Route::get('active', 'getActiveSharings');
    });

    Route::prefix('invoices')->middleware('role:admin|invoicing')->group(function () {
        Route::get('/cashflow', \App\Http\Controllers\InvoiceController::class.'@showCashFlow');
        Route::post('/cashflow/upload', \App\Http\Controllers\InvoiceController::class.'@uploadBankCsv');
        Route::get('/current_no', fn () => \App\Models\Invoice::getCurrentInvoiceNumber());
        Route::get('/current_no_int', fn () => \App\Models\Invoice::getCurrentInvoiceNumberInt());
        Route::get('/last-payments', fn () => \App\Models\Invoice::whereNotNull('paid_at')->latest('paid_at')->with('company')->take(20)->get());
        Route::get('/monthly-revenue-ranges', \App\Http\Controllers\InvoiceController::class.'@indexMonthlyRevenueRanges');
        Route::get('/monthly-spiral-revenue', \App\Http\Controllers\InvoiceController::class.'@indexMonthlySpiralRevenue');

        Route::prefix('{_}')->controller(\App\Http\Controllers\InvoiceController::class)->group(function () {
            Route::get('invoice-items', 'indexInvoiceItems');
            Route::get('pdf', 'showPdf');
            Route::post('cancel', 'updateCancel');
            Route::post('send-mail', 'sendMail');
            Route::post('send-reminder', 'sendReminder');
            Route::put('update-values', 'updateValues');
            Route::post('datev', 'sendToDatev');
            Route::put('redo', 'updateRedo');
        })->whereNumber('_');
    });

    Route::prefix('invoice_items')->group(function () {
        Route::put('/reorder', \App\Http\Controllers\InvoiceItemController::class.'@reorder');
        Route::post('/combine', \App\Http\Controllers\InvoiceItemController::class.'@combine');
        Route::middleware('role:admin|invoicing|project_manager')->group(function () {
            Route::get('/standing-orders', \App\Http\Controllers\InvoiceItemController::class.'@indexStandingOrders');
            Route::prefix('{_}')->group(function () {
                Route::post('predict', \App\Http\Controllers\InvoiceItemPredictionController::class.'@predict');
                Route::delete('predict', \App\Http\Controllers\InvoiceItemPredictionController::class.'@deletePrediction');
            })->whereNumber('_');
        });
    });

    Route::prefix('invoice_reminders')->middleware('role:admin|invoicing')->group(function () {
        Route::get('/{_}/pdf', function (\App\Models\InvoiceReminder $_) {
            if (!$_->invoice) {
                return response()->json(['error' => 'Invoice not found (may be deleted)', 'reminder_id' => $_->id, 'invoice_id' => $_->invoice_id], 404);
            }
            if (!$_->file_dir) {
                return response()->json(['error' => 'Reminder has no file path stored', 'reminder_id' => $_->id], 500);
            }
            if (!\Illuminate\Support\Facades\Storage::exists($_->file_dir)) {
                return response()->json(['error' => 'PDF file not found in storage', 'reminder_id' => $_->id, 'file_dir' => $_->file_dir], 404);
            }
            return \App\Models\File::stream($_->file_dir, $_->invoice->name.' - '.$_->stage.' reminder.pdf');
        });
    });

    Route::prefix('marketing')->middleware('role:admin|marketing')->group(function () {
        Route::get('user', \App\Http\Controllers\MarketingController::class.'@showUserForAddon'); // Firefox addon auth check
        Route::get('funnel', \App\Http\Controllers\MarketingController::class.'@getFunnelChart');
        Route::get('remarketing', \App\Http\Controllers\MarketingController::class.'@getRemarketing');
        Route::get('remarketing/due', \App\Http\Controllers\MarketingController::class.'@getRemarketingDue');

        // Marketing automation routes (consolidated in MarketingController)
        Route::prefix('initiatives')->controller(\App\Http\Controllers\MarketingController::class)->group(function () {
            Route::get('', 'indexInitiatives');
            Route::post('', 'storeInitiative');
            Route::get('for-addon', 'indexInitiativesForAddon'); // Firefox addon support
            Route::prefix('{marketingInitiative}')->group(function () {
                Route::get('', 'showInitiative');
                Route::put('', 'updateInitiative');
                Route::delete('', 'destroyInitiative');
                Route::get('channels', 'indexInitiativeChannels');
                Route::post('channels', 'addInitiativeChannel');
                Route::put('channels', 'updateInitiativeChannels');
                Route::delete('channels/{leadSource}', 'removeInitiativeChannel');
                Route::get('workflows', 'indexInitiativeWorkflows');
                Route::post('workflows', 'attachWorkflowToInitiative');
                Route::delete('workflows/{marketingWorkflow}', 'detachWorkflowFromInitiative');
                Route::get('metrics', 'indexInitiativeMetrics');
                Route::get('metrics/all', 'indexAllInitiativeMetrics');
                Route::post('metrics', 'attachInitiativeMetric');
                Route::put('metrics/{marketingPerformanceMetric}', 'updateInitiativeMetric');
                Route::delete('metrics/{marketingPerformanceMetric}', 'detachInitiativeMetric');
                Route::get('stats', 'showInitiativeStats');
                Route::post('users', 'subscribeUserToInitiative');
                Route::delete('users/{userId}', 'unsubscribeUserFromInitiative');
                Route::get('activities', 'indexInitiativeActivities');
                Route::post('activities', 'storeInitiativeActivity');
                Route::put('activities/{marketingInitiativeActivity}', 'updateInitiativeActivity');
                Route::delete('activities/{marketingInitiativeActivity}', 'destroyInitiativeActivity');
            });
        });

        Route::prefix('workflows')->controller(\App\Http\Controllers\MarketingController::class)->group(function () {
            Route::get('', 'indexWorkflows');
            Route::post('', 'storeWorkflow');
            Route::prefix('{marketingWorkflow}')->group(function () {
                Route::get('', 'showWorkflow');
                Route::put('', 'updateWorkflow');
                Route::delete('', 'destroyWorkflow');
                Route::get('stats', 'showWorkflowStats');
                Route::get('activities', 'indexWorkflowActivities');
                Route::post('activities', 'storeWorkflowActivity');
                Route::put('activities/{marketingActivity}', 'updateWorkflowActivity');
                Route::delete('activities/{marketingActivity}', 'destroyWorkflowActivity');
            });
        });

        Route::prefix('activities')->controller(\App\Http\Controllers\MarketingController::class)->group(function () {
            Route::prefix('{marketingActivity}')->group(function () {
                Route::get('metrics', 'indexActivityMetrics');
                Route::post('metrics', 'attachActivityMetric');
                Route::put('metrics/{marketingPerformanceMetric}', 'updateActivityMetric');
                Route::delete('metrics/{marketingPerformanceMetric}', 'detachActivityMetric');
            });
        });

        Route::prefix('prospects')->controller(\App\Http\Controllers\MarketingController::class)->group(function () {
            Route::get('', 'indexProspects');
            Route::post('', 'storeProspect');
            Route::get('stats', 'showProspectStats');
            Route::post('from-addon', 'storeProspectFromAddon');
            Route::get('activities-for-addon', 'indexProspectActivitiesForAddon');
            Route::put('activity/{activityId}', 'updateProspectActivityById');
            Route::prefix('{marketingProspect}')->group(function () {
                Route::get('', 'showProspect');
                Route::put('', 'updateProspect');
                Route::delete('', 'destroyProspect');
                Route::post('link-to-company', 'linkProspectToCompany');
                Route::post('convert', 'convertProspect');
                Route::post('postpone-activities', 'postponeProspectActivities');
                Route::put('activities/{activityId}/status', 'updateProspectActivityStatus');
            });
        });

        Route::prefix('metrics')->controller(\App\Http\Controllers\MarketingController::class)->group(function () {
            Route::get('', 'indexPerformanceMetrics');
            Route::post('', 'storePerformanceMetric');
            Route::prefix('{marketingPerformanceMetric}')->group(function () {
                Route::get('', 'showPerformanceMetric');
                Route::put('', 'updatePerformanceMetric');
                Route::delete('', 'destroyPerformanceMetric');
            });
        });
    });

    Route::prefix('marketing-assets')->controller(\App\Http\Controllers\MarketingAssetController::class)->middleware('role:admin|marketing')->group(function () {
        Route::get('', 'index');
        Route::post('', 'store');
        Route::put('{id}/tags', 'updateTags');
        Route::delete('{id}', 'destroy');
    });

    Route::prefix('milestones')->controller(\App\Http\Controllers\MilestoneController::class)->group(function () {
        Route::get('overview', 'indexOverview');
        Route::delete('{milestone}/dependencies', 'removeDependency');
        Route::delete('{milestone}/dependencies/bulk', 'removeDependencies');
        Route::post('{milestone}/dependencies/bulk/delete', 'removeDependencies');
        Route::post('{milestone}/invoice-items/{invoice_item}', 'linkInvoiceItem');
        Route::delete('{milestone}/invoice-items/{invoice_item}', 'unlinkInvoiceItem');
        Route::post('{milestone}/dependencies', 'addDependency');
        Route::put('reorder', 'reorder');
    });

    Route::prefix('neuron')->group(function () {
        Route::get('/attention', \App\Http\Controllers\NexusController::class.'@attention');
    });

    Route::prefix('params')->group(function () {
        Route::get('{key}/history', \App\Http\Controllers\ParamController::class.'@history');
        Route::prefix('{key}/{type?}/{id?}')->controller(\App\Http\Controllers\ParamController::class)->group(function () {
            Route::get('history', 'history');
            Route::get('', 'show');
            Route::post('', 'store');
            Route::put('', 'update');
            Route::delete('', 'destroy');
        })->whereNumber('_');
    });

    Route::prefix('products')->middleware('role:admin|product_manager')->group(function () {
        Route::get('statistics', \App\Http\Controllers\ProductController::class.'@showStatistics');
        Route::get('root-groups', \App\Http\Controllers\ProductController::class.'@indexRootGroups');
        Route::prefix('{_}')->group(function () {
            Route::get('invoice-items', fn (\App\Models\Product $_) => $_->indexedItems()->get());
            Route::get('split', \App\Http\Controllers\ProductController::class.'@showSplit');
            Route::put('deprecate', fn (\App\Models\Product $_) => $_->activate(false));
            Route::put('activate', fn (\App\Models\Product $_) => $_->activate(true));
            Route::get('customers', \App\Http\Controllers\ProductController::class.'@indexCustomers');
        })->whereNumber('_');
    });

    Route::prefix('product_groups')->middleware('role:admin|product_manager')->group(function () {
        Route::prefix('{_}')->group(function () {
            Route::put('deprecate', fn (\App\Models\ProductGroup $_) => $_->activate(false));
            Route::put('activate', fn (\App\Models\ProductGroup $_) => $_->activate(true));
            Route::get('customers', \App\Http\Controllers\ProductGroupController::class.'@indexCustomers');
        })->whereNumber('_');
    });

    Route::prefix('projects')->middleware('role:admin|user|project_manager')->group(function () {
        Route::get('reporting', [\App\Http\Controllers\ProjectController::class, 'showReporting']);
        Route::get('missing-git', [\App\Http\Controllers\ProjectController::class, 'indexMissingGit']);
        Route::get('frameworks', [\App\Http\Controllers\ProjectController::class, 'indexFrameworks']);
        Route::put('frameworks', [\App\Http\Controllers\ProjectController::class, 'updateFrameworks']);
        Route::get('frameworks/latest', [\App\Http\Controllers\ProjectController::class, 'indexFrameworksLatest']);
        Route::prefix('{_}')->controller(\App\Http\Controllers\ProjectController::class)->group(function () {
            Route::get('assignees', 'indexAssignees');
            Route::post('assignees', 'storeAssignee');
            Route::put('set-main-contact', 'updateSetMainContact');
            Route::get('comments', 'indexComments');
            Route::get('foci', 'indexFoci');
            Route::get('invoice', 'makeInvoice');
            Route::post('installment-invoice', 'makeInstallmentInvoice');
            Route::get('quote-descriptions', 'indexQuoteDescriptions');
            Route::middleware('role:admin|invoicing|project_manager')->group(function () {
                Route::get('invoice-items', 'indexInvoiceItems');
                Route::get('support-items', 'indexSupportItems');
            });
            Route::get('milestones', 'indexMilestones');
            Route::post('milestones', 'storeMilestone');
            Route::post('convert-invoice-items-to-milestones', 'convertInvoiceItemsToMilestones');
            Route::put('move-regular-to-customer', 'moveRegularItemsToCustomer');
            Route::put('move-support-to-customer', 'moveSupportToCustomer');
            Route::put('postpone', 'postpone');
            Route::get('pdf', 'makePdf');
            Route::get('connection-projects', 'indexConnectionProjects');
            Route::post('connection-projects', 'storeConnectionProject');
            Route::delete('connection-projects/{connectionProject}', 'destroyConnectionProject');
        })->whereNumber('_');
        Route::prefix('{_}')->group(function () {
            Route::get('invoice-items/stats', \App\Http\Controllers\InvoiceItemPredictionController::class.'@stats');
            Route::post('media', \App\Http\Controllers\FileController::class.'@uploadProjectMedia');
            Route::post('plugin_links', \App\Http\Controllers\PluginLinkController::class.'@storeForProject');
            Route::post('plugin_link_channel', \App\Http\Controllers\PluginLinkController::class.'@createPluginLinkWithChannel');
            Route::get('tasks', \App\Http\Controllers\TaskController::class.'@indexForProject');
            Route::post('tasks', \App\Http\Controllers\TaskController::class.'@storeForProject');
            Route::put('tasks/{task}', \App\Http\Controllers\TaskController::class.'@update');
            Route::put('tasks/{task}/assign', \App\Http\Controllers\TaskController::class.'@assign');
            Route::delete('tasks/{task}', \App\Http\Controllers\TaskController::class.'@destroy');
        })->whereNumber('_');
        \App\Http\Controllers\ParamController::getRoute(\App\Models\Project::class);
        Route::delete('{project}/milestones/wipe-board', [\App\Http\Controllers\MilestoneController::class, 'destroyAllForProject']);
    });

    Route::prefix('uptime_monitors')->middleware('role:admin|user|project_manager')->controller(\App\Http\Controllers\UptimeMonitorController::class)->group(function () {
        Route::get('', 'index');
        Route::post('', 'store');
        Route::prefix('{_}')->group(function () {
            Route::get('', 'show');
            Route::put('', 'update');
            Route::delete('', 'destroy');
            Route::get('checks', 'indexChecks');
            Route::get('recipients', 'indexRecipients');
            Route::put('recipients/{user}', 'updateRecipient');
            Route::post('test', 'testCheck');
            Route::get('stats', 'stats');
        })->whereNumber('_');
    });

    Route::prefix('projects/{_}/uptime_monitors')->middleware('role:admin|user|project_manager')->group(function () {
        Route::get('', \App\Http\Controllers\UptimeMonitorController::class.'@indexForProject');
    })->whereNumber('_');

    Route::prefix('debriefs')->middleware('role:admin|user|project_manager')->controller(\App\Http\Controllers\DebriefController::class)->group(function () {
        Route::get('categories', 'indexCategories');
        Route::get('problems', 'indexProblems');
        Route::get('problems/search', 'searchProblems');
        Route::post('problems', 'storeProblem');
        Route::prefix('problems/{problem}')->group(function () {
            Route::get('', 'showProblem');
            Route::put('', 'updateProblem');
            Route::delete('', 'destroyProblem');
            Route::post('solutions', 'storeProblemSolution');
            Route::put('solutions/{solution}', 'updateProblemSolution');
            Route::delete('solutions/{solution}', 'destroyProblemSolution');
        });
        Route::get('solutions', 'indexSolutions');
        Route::get('solutions/search', 'searchSolutions');
        Route::post('solutions', 'storeSolution');
        Route::prefix('solutions/{solution}')->group(function () {
            Route::put('', 'updateSolution');
            Route::delete('', 'destroySolution');
        });
        Route::get('', 'indexDebriefs');
        Route::prefix('{debrief}')->group(function () {
            Route::put('', 'updateDebrief');
            Route::delete('', 'destroyDebrief');
            Route::post('problems', 'storeDebriefProblem');
            Route::put('problems/{problem}', 'updateDebriefProblem');
            Route::delete('problems/{problem}', 'destroyDebriefProblem');
            Route::post('positives', 'storePositive');
        });
        Route::put('positives/{positive}', 'updatePositive');
        Route::delete('positives/{positive}', 'destroyPositive');
        Route::get('stats/aggregated', 'showStatsAggregated');
        Route::get('stats/categories', 'showStatsCategories');
        Route::get('stats/top-problems', 'showStatsTopProblems');
        Route::get('stats/top-solutions', 'showStatsTopSolutions');
        Route::get('stats/top-positives', 'showStatsTopPositives');
        Route::get('stats/categories-positives', 'showStatsCategoriesPositives');
        Route::get('stats/trends', 'showStatsTrends');
    });

    Route::prefix('projects/{project}/debriefs')->middleware('role:admin|user|project_manager')->controller(\App\Http\Controllers\DebriefController::class)->group(function () {
        Route::get('', 'indexProjectDebriefs');
        Route::post('', 'storeDebrief');
    });

    Route::prefix('sentinels')->group(function () {
        Route::get('/active', \App\Http\Controllers\SentinelController::class.'@indexActive');
    });

    Route::controller(\App\Http\Controllers\StatsController::class)->prefix('stats')->group(function () {
        Route::get('my-working-time', 'showMyWorkingTime');
        Route::get('project-success-probability-curve', 'showLeadProbabilityByDuration');
        Route::get('project-success-probability-curve/{span}', 'showLeadProbabilityByDuration');
        Route::get('project-success-probability-curve-value', 'showLeadProbabilityByBudget');
        Route::get('project-success-probability-curve-value/{span}', 'showLeadProbabilityByBudget');
        Route::get('quote-accuracy', 'showQuoteAccuracy');
        Route::get('team-status', 'showTeamStatus');
        Route::get('focus-categories', 'indexFocusCategories');

        Route::middleware('role:admin|invoicing|financial')->group(function () {
            Route::get('revenue-current-year', 'showRevenueCurrentYear');
            Route::get('service-vs-budget', 'showSvB');
            Route::get('invoice-overall', 'showInvoiceOverall');
            Route::get('linear-regression-forecast', 'showLinearRegressionForecast');
            Route::get('company-prediction-accuracy', 'showCompanyPredictionAccuracy');
        });

        Route::middleware('role:admin|hr|project_manager')->group(function () {
            Route::get('prediction-accuracy', 'showPredictionAccuracy');
            Route::get('focus-accuracy', 'showFocusAccuracy');
        });
    });

    Route::prefix('timetracker')->group(function () {
        Route::get('/', \App\Http\Controllers\TimetrackerController::class.'@index');
        Route::put('/', \App\Http\Controllers\TimetrackerController::class.'@update');
        Route::post('/', \App\Http\Controllers\TimetrackerController::class.'@store');
        Route::get('/recent-comments', \App\Http\Controllers\TimetrackerController::class.'@indexRecentComments');
        Route::post('/search', \App\Http\Controllers\TimetrackerController::class.'@search');
        Route::post('/subscribe', \App\Http\Controllers\TimetrackerController::class.'@subscribe');
        Route::post('/unsubscribe', \App\Http\Controllers\TimetrackerController::class.'@unsubscribe');
        Route::post('/status', \App\Http\Controllers\TimetrackerController::class.'@updateStatus');
        Route::post('/join', \App\Http\Controllers\TimetrackerController::class.'@join');
        Route::put('/current_focus', \App\Http\Controllers\TimetrackerController::class.'@updateCurrentFocus');
        Route::put('/status', \App\Http\Controllers\TimetrackerController::class.'@updateStatus');
    });

    Route::prefix('users')->group(function () {
        Route::get('/me', function () { return Auth::user(); });
        Route::get('/environment', \App\Http\Controllers\UserController::class.'@showEnvironment');
        Route::post('travel-expenses', \App\Http\Controllers\FileController::class.'@uploadTravelExpenses');

        Route::prefix('{_}')->middleware('hr_permission')->group(function () {
            Route::post('avatar', \App\Http\Controllers\FileController::class.'@storeUserAvatar');
            Route::get('foci', \App\Http\Controllers\UserController::class.'@indexFoci');
            Route::get('milestones', \App\Http\Controllers\UserController::class.'@indexMilestones');
            Route::get('pm-milestones', \App\Http\Controllers\UserController::class.'@indexPmMilestones');
            Route::get('project_load', \App\Http\Controllers\UserController::class.'@indexProjectLoad');
            Route::get('vacation_stats', \App\Http\Controllers\VacationController::class.'@indexVacationStats');
            Route::post('encrypt', \App\Http\Controllers\EncryptionController::class.'@encrypt');
            Route::get('vacation_grants', \App\Http\Controllers\VacationController::class.'@indexGrants');
            Route::get('vacation_requests', \App\Http\Controllers\VacationController::class.'@indexRequests');
            Route::get('vacation_absences', \App\Http\Controllers\VacationController::class.'@indexAbsences');
            Route::get('show-foci-30d', \App\Http\Controllers\UserController::class.'@showFoci30D');
            Route::get('daily-workload', \App\Http\Controllers\UserController::class.'@indexDailyWorkload');

            Route::middleware('role:admin|hr')->get('time-based-employment', \App\Http\Controllers\UserController::class.'@showTimeBasedEmploymentInfo');
            Route::middleware('role:admin|hr')->post('time-based-employment', \App\Http\Controllers\UserController::class.'@createTbe');
            Route::prefix('employment')->middleware('role:admin|hr')->group(function () {
                Route::post('', \App\Http\Controllers\UserController::class.'@storeEmployment');
                Route::put('{id}', \App\Http\Controllers\UserController::class.'@updateEmployment');
                Route::delete('{id}', \App\Http\Controllers\UserController::class.'@deleteEmployment');
            });
            Route::post('reset-password', \App\Http\Controllers\UserController::class.'@resetPassword')->middleware('role:admin');
        })->whereNumber('_');
        \App\Http\Controllers\ParamController::getRoute(\App\Models\User::class);
    });

    Route::prefix('vacations')->controller(\App\Http\Controllers\VacationController::class)->group(function () {
        Route::get('holidays', 'indexHolidays');
        Route::post('sick-notes', 'storeSickNote');
        Route::put('/{vacation}/revoke', 'revoke');

        Route::middleware('role:admin|hr')->group(function () {
            Route::get('requests', 'indexPendingRequests');
            Route::get('sick-notes', 'indexSickNotes');
            Route::post('manual', 'storeManual');
            Route::put('/{vacation}/approve', 'approve');
            Route::prefix('{_}')->group(function () {
                Route::put('acknowledge', 'acknowledge');
            });
        });
    });
    Route::get('vacation_grants/{grant}', \App\Http\Controllers\VacationController::class.'@showGrant');
    Route::middleware('role:admin|hr')->group(function () {
        Route::post('vacation_grants', \App\Http\Controllers\VacationController::class.'@storeGrant');
        Route::delete('vacation_grants/{grant}', \App\Http\Controllers\VacationController::class.'@destroyGrant');
    });

    Route::prefix('widgets')->group(function () {
        Route::get('new-items', \App\Http\Controllers\WidgetController::class.'@indexNewItems');
        Route::get('prepared-invoices', \App\Http\Controllers\WidgetController::class.'@preparedInvoices')->middleware('role:admin|financial');
        Route::get('unpaid-invoices', \App\Http\Controllers\WidgetController::class.'@unpaidInvoices')->middleware('role:admin|financial');
        Route::get('cashflow/{key}', \App\Http\Controllers\WidgetController::class.'@cashflowWidget')->middleware('role:admin|financial|project_manager');
        Route::get('index-jubilees', \App\Http\Controllers\WidgetController::class.'@indexJubilees')->middleware('role:admin|hr|project_manager');
        Route::get('index-time-based-employees', \App\Http\Controllers\WidgetController::class.'@indexTimeBasedEmployees')->middleware('role:admin|hr');
    });

    // Role management (admin only)
    Route::prefix('roles')->middleware('role:admin')->group(function () {
        Route::get('', [\App\Http\Controllers\RoleController::class, 'index']);
        Route::post('{role}/users/{user}', [\App\Http\Controllers\RoleController::class, 'assign']);
        Route::delete('{role}/users/{user}', [\App\Http\Controllers\RoleController::class, 'remove']);
    });

    Route::resource('calendar_entries', \App\Http\Controllers\CalendarController::class);
    Route::resource('assignments', \App\Http\Controllers\AssignmentController::class);
    Route::resource('comments', \App\Http\Controllers\CommentController::class);
    Route::resource('companies', \App\Http\Controllers\CompanyController::class);
    Route::resource('company_contacts', \App\Http\Controllers\CompanyContactController::class);
    Route::resource('contacts', \App\Http\Controllers\ContactController::class);
    Route::resource('encryptions', \App\Http\Controllers\EncryptionController::class);
    Route::resource('expenses', \App\Http\Controllers\ExpenseController::class);
    Route::resource('files', \App\Http\Controllers\FileController::class);
    Route::resource('foci', \App\Http\Controllers\FocusController::class);
    Route::resource('invoices', \App\Http\Controllers\InvoiceController::class);
    Route::resource('invoice_items', \App\Http\Controllers\InvoiceItemController::class);
    Route::resource('lead_sources', \App\Http\Controllers\LeadSourceController::class);
    Route::resource('milestones', \App\Http\Controllers\MilestoneController::class);
    Route::resource('plugin_links', \App\Http\Controllers\PluginLinkController::class);
    Route::resource('products', \App\Http\Controllers\ProductController::class);
    Route::resource('product_groups', \App\Http\Controllers\ProductGroupController::class);
    Route::resource('projects', \App\Http\Controllers\ProjectController::class);
    Route::resource('sentinels', \App\Http\Controllers\SentinelController::class);
    Route::resource('tasks', \App\Http\Controllers\TaskController::class);
    Route::resource('users', \App\Http\Controllers\UserController::class)->except(['index', 'store', 'destroy']);
    Route::delete('users/{user}', [\App\Http\Controllers\UserController::class, 'destroy'])->middleware('role:admin');
    Route::post('users', [\App\Http\Controllers\UserController::class, 'store'])->middleware('role:admin|hr');
    Route::get('users', [\App\Http\Controllers\UserController::class, 'index'])->middleware('hr_permission');
    Route::resource('vacations', \App\Http\Controllers\VacationController::class);
    Route::resource('vaults', \App\Http\Controllers\VaultController::class);
});

Route::prefix('at2-connect')->middleware('cache.headers:no_cache;must_revalidate')->middleware(\App\Http\Middleware\At2ConnectAuthMiddleware::class)->controller(\App\Http\Controllers\At2ConnectController::class)->group(function () {
    Route::get('/user', 'showUser');
    Route::get('/projects', 'indexProjects');
    Route::prefix('{channel_id}')->group(function () {
        Route::get('posts', 'indexPosts');
        Route::get('members', 'indexMembers');
        Route::post('file', 'createFile');
        Route::post('post', 'createPost');
    });
    Route::prefix('{post_id}')->group(function () {
        Route::post('reaction', 'createReaction');
        Route::delete('reaction/{emoji_name}', 'deleteReaction');
    });
    Route::prefix('{file_id}')->group(function () {
        Route::get('thumbnail', 'showThumbnail');
        Route::get('preview', 'showPreview');
        Route::get('', 'showFile');
    });
});

Route::prefix('gitlab')->controller(\App\Http\Controllers\PluginGitController::class)->group(function () {
    Route::post('', 'onWebhook');
    Route::put('', 'onWebhook');
});
