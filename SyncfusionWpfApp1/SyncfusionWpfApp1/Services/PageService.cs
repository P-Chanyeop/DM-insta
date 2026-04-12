using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows.Controls;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.ViewModels;
using SyncfusionWpfApp1.Views;

namespace SyncfusionWpfApp1.Services
{
    public class PageService : IPageService
    {
        private readonly Dictionary<string, Type> _pages = new Dictionary<string, Type>();
        private readonly IServiceProvider _serviceProvider;

        public PageService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
            Configure<AutoCompleteViewModel, AutoCompletePage>();
            Configure<BusyIndicatorViewModel, BusyIndicatorPage>();
            Configure<CarouselViewModel, CarouselPage>();
            Configure<ChartsViewModel, ChartsPage>();
            Configure<DataGridViewModel, DataGridPage>();
            Configure<DateTimeRangeNavigatorViewModel, DateTimeRangeNavigatorPage>();
            Configure<DiagramsViewModel, DiagramsPage>();
            Configure<DockingManagerViewModel, DockingManagerPage>();
            Configure<DocumentContainerViewModel, DocumentContainerPage>();
            Configure<EditorControlViewModel, EditorControlPage>();
            Configure<GridControlViewModel, GridControlPage>();
            Configure<HeatMapViewModel, HeatMapPage>();
            Configure<KanbanViewModel, KanbanPage>();
            Configure<MainViewModel, MainPage>();
            Configure<MenuAdvViewModel, MenuAdvPage>();
            Configure<NavigationDrawerViewModel, NavigationDrawerPage>();
            Configure<PdfViewerViewModel, PdfViewerPage>();
            Configure<PivotGridViewModel, PivotGridPage>();
            Configure<PropertyGridViewModel, PropertyGridPage>();
            Configure<RadialMenuViewModel, RadialMenuPage>();
            Configure<RangeSliderViewModel, RangeSliderPage>();
            Configure<RatingViewModel, RatingPage>();
            Configure<RibbonViewModel, RibbonPage>();
            Configure<RichTextBoxAdvViewModel, RichTextBoxAdvPage>();
            Configure<SchedulerViewModel, SchedulerPage>();
            Configure<SettingsViewModel, SettingsPage>();
            Configure<SpreadsheetViewModel, SpreadsheetPage>();
            Configure<TabControlExtViewModel, TabControlExtPage>();
            Configure<TileViewViewModel, TileViewPage>();
            Configure<ToolBarAdvViewModel, ToolBarAdvPage>();
            Configure<TreeGridViewModel, TreeGridPage>();
            Configure<TreeViewViewModel, TreeViewPage>();
        }

        public Type GetPageType(string key)
        {
            Type pageType;
            lock (_pages)
            {
                if (!_pages.TryGetValue(key, out pageType))
                {
                    throw new ArgumentException($"Page not found: {key}. Did you forget to call PageService.Configure?");
                }
            }

            return pageType;
        }

        public Page GetPage(string key)
        {
            var pageType = GetPageType(key);
            return _serviceProvider.GetService(pageType) as Page;
        }

        private void Configure<VM, V>()
            where VM : Observable
            where V : Page
        {
            lock (_pages)
            {
                var key = typeof(VM).FullName;
                if (_pages.ContainsKey(key))
                {
                    throw new ArgumentException($"The key {key} is already configured in PageService");
                }

                var type = typeof(V);
                if (_pages.Any(p => p.Value == type))
                {
                    throw new ArgumentException($"This type is already configured with key {_pages.First(p => p.Value == type).Key}");
                }

                _pages.Add(key, type);
            }
        }
    }
}
