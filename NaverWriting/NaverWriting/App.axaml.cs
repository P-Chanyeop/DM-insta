using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using NaverWriting.ViewModel;
using System.Collections.Generic;
using System.Text.Json;

namespace NaverWriting
{
    public partial class App : Application
    {
        public override void Initialize()
        {
            AvaloniaXamlLoader.Load(this);
        }

        public override void OnFrameworkInitializationCompleted()
        {
            if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
            {
                desktop.MainWindow = new MainWindow();

                //// API Key, RemainingDays ¿¹½Ã
                //desktop.MainWindow = new NaverWritingWindow()
                //{
                //    DataContext = new MainViewModel()
                //};

            };

            base.OnFrameworkInitializationCompleted();
            
        }
        public override void RegisterServices()
        {
            base.RegisterServices();

        }
    }
}