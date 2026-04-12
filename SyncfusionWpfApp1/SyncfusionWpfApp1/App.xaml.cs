using System.IO;
using System.Reflection;
using System.Windows;
using System.Windows.Threading;

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Contracts.Views;
using SyncfusionWpfApp1.Models;
using SyncfusionWpfApp1.Services;
using SyncfusionWpfApp1.ViewModels;
using SyncfusionWpfApp1.Views;

namespace SyncfusionWpfApp1
{
    // For more inforation about application lifecyle events see https://docs.microsoft.com/dotnet/framework/wpf/app-development/application-management-overview

    // WPF UI elements use language en-US by default.
    // If you need to support other cultures make sure you add converters and review dates and numbers in your UI to ensure everything adapts correctly.
    // Tracking issue for improving this is https://github.com/dotnet/wpf/issues/1946
    public partial class App : Application
    {
        private IHost _host;

        public T GetService<T>()
            where T : class
            => _host.Services.GetService(typeof(T)) as T;

        public App()
        {
            // Add your Syncfusion license key for WPF platform with corresponding Syncfusion NuGet version referred in project. For more information about license key see https://help.syncfusion.com/common/essential-studio/licensing/license-key.
            // Syncfusion.Licensing.SyncfusionLicenseProvider.RegisterLicense("Add your license key here"); 
            Syncfusion.Licensing.SyncfusionLicenseProvider.RegisterLicense("Ngo9BigBOggjHTQxAR8/V1NDaF5cWGVCf1JpR2FGfV5ycEVHal5UTnVYUj0eQnxTdEFiWX1acH1XT2FcVEV2Wg==");
        }

        private async void OnStartup(object sender, StartupEventArgs e)
        {
            var appLocation = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);

            // For more information about .NET generic host see  https://docs.microsoft.com/aspnet/core/fundamentals/host/generic-host?view=aspnetcore-3.0
            _host = Host.CreateDefaultBuilder(e.Args)
                    .ConfigureAppConfiguration(c =>
                    {
                        c.SetBasePath(appLocation);
                    })
                    .ConfigureServices(ConfigureServices)
                    .Build();

            await _host.StartAsync();
        }

        private void ConfigureServices(HostBuilderContext context, IServiceCollection services)
        {
            // TODO WTS: Register your services, viewmodels and pages here

            // App Host
            services.AddHostedService<ApplicationHostService>();

            // Core Services
            services.AddSingleton<IFileService, FileService>();

            // Services
            services.AddSingleton<IWindowManagerService, WindowManagerService>();
            services.AddSingleton<IApplicationInfoService, ApplicationInfoService>();
            services.AddSingleton<ISystemService, SystemService>();
            services.AddSingleton<IPersistAndRestoreService, PersistAndRestoreService>();
            services.AddSingleton<IThemeSelectorService, ThemeSelectorService>();
            services.AddSingleton<IPageService, PageService>();
            services.AddSingleton<INavigationService, NavigationService>();

            // Views and ViewModels
            services.AddTransient<IShellWindow, ShellWindow>();
            services.AddTransient<ShellViewModel>();

            services.AddTransient<AutoCompleteViewModel>();
            services.AddTransient<AutoCompletePage>();

            services.AddTransient<BusyIndicatorViewModel>();
            services.AddTransient<BusyIndicatorPage>();

            services.AddTransient<CarouselViewModel>();
            services.AddTransient<CarouselPage>();

            services.AddTransient<ChartsViewModel>();
            services.AddTransient<ChartsPage>();

            services.AddTransient<DataGridViewModel>();
            services.AddTransient<DataGridPage>();

            services.AddTransient<DateTimeRangeNavigatorViewModel>();
            services.AddTransient<DateTimeRangeNavigatorPage>();

            services.AddTransient<DiagramsViewModel>();
            services.AddTransient<DiagramsPage>();

            services.AddTransient<DockingManagerViewModel>();
            services.AddTransient<DockingManagerPage>();

            services.AddTransient<DocumentContainerViewModel>();
            services.AddTransient<DocumentContainerPage>();

            services.AddTransient<EditorControlViewModel>();
            services.AddTransient<EditorControlPage>();

            services.AddTransient<GridControlViewModel>();
            services.AddTransient<GridControlPage>();

            services.AddTransient<HeatMapViewModel>();
            services.AddTransient<HeatMapPage>();

            services.AddTransient<KanbanViewModel>();
            services.AddTransient<KanbanPage>();

            services.AddTransient<MainViewModel>();
            services.AddTransient<MainPage>();

            services.AddTransient<MenuAdvViewModel>();
            services.AddTransient<MenuAdvPage>();

            services.AddTransient<NavigationDrawerViewModel>();
            services.AddTransient<NavigationDrawerPage>();

            services.AddTransient<PdfViewerViewModel>();
            services.AddTransient<PdfViewerPage>();

            services.AddTransient<PivotGridViewModel>();
            services.AddTransient<PivotGridPage>();

            services.AddTransient<PropertyGridViewModel>();
            services.AddTransient<PropertyGridPage>();

            services.AddTransient<RadialMenuViewModel>();
            services.AddTransient<RadialMenuPage>();

            services.AddTransient<RangeSliderViewModel>();
            services.AddTransient<RangeSliderPage>();

            services.AddTransient<RatingViewModel>();
            services.AddTransient<RatingPage>();

            services.AddTransient<RibbonViewModel>();
            services.AddTransient<RibbonPage>();

            services.AddTransient<RichTextBoxAdvViewModel>();
            services.AddTransient<RichTextBoxAdvPage>();

            services.AddTransient<SchedulerViewModel>();
            services.AddTransient<SchedulerPage>();

            services.AddTransient<SettingsViewModel>();
            services.AddTransient<SettingsPage>();

            services.AddTransient<SpreadsheetViewModel>();
            services.AddTransient<SpreadsheetPage>();

            services.AddTransient<TabControlExtViewModel>();
            services.AddTransient<TabControlExtPage>();

            services.AddTransient<TileViewViewModel>();
            services.AddTransient<TileViewPage>();

            services.AddTransient<ToolBarAdvViewModel>();
            services.AddTransient<ToolBarAdvPage>();

            services.AddTransient<TreeGridViewModel>();
            services.AddTransient<TreeGridPage>();

            services.AddTransient<TreeViewViewModel>();
            services.AddTransient<TreeViewPage>();

            services.AddTransient<IShellDialogWindow, ShellDialogWindow>();
            services.AddTransient<ShellDialogViewModel>();

            // Configuration
            services.Configure<AppConfig>(context.Configuration.GetSection(nameof(AppConfig)));
        }

        private async void OnExit(object sender, ExitEventArgs e)
        {
            await _host.StopAsync();
            _host.Dispose();
            _host = null;
        }

        private void OnDispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
        {
            // TODO WTS: Please log and handle the exception as appropriate to your scenario
            // For more info see https://docs.microsoft.com/dotnet/api/system.windows.application.dispatcherunhandledexception?view=netcore-3.0
        }
    }
}
