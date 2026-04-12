using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

using Microsoft.Win32;

using Syncfusion.SfSkinManager;
using Syncfusion.UI.Xaml.NavigationDrawer;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Models;
using SyncfusionWpfApp1.Views;

namespace SyncfusionWpfApp1.Services
{
    public class ThemeSelectorService : IThemeSelectorService
    {
        private bool IsHighContrastActive
                        => SystemParameters.HighContrast;

        public ThemeSelectorService()
        {
            SystemEvents.UserPreferenceChanging += OnUserPreferenceChanging;
        }

        public bool SetTheme(AppTheme? theme = null)
        {
            if (IsHighContrastActive)
            {
                // TODO WTS: Set high contrast theme
                // You can add custom themes following the docs on https://mahapps.com/docs/themes/thememanager
            }
            else if (theme == null)
            {
                if (App.Current.Properties.Contains("Theme"))
                {
                    // Read saved theme from properties
                    var themeName = App.Current.Properties["Theme"].ToString();
                    theme = (AppTheme)Enum.Parse(typeof(AppTheme), themeName);
                }
                else
                {
                    // Set default theme
                    theme = AppTheme.Windows11Light;
                }
            }

            string themeNames = theme.Value.ToString();
            var productDemosWindow = Application.Current.Windows.OfType<ShellWindow>();
            foreach (var window in productDemosWindow)
            {
                SfSkinManager.SetTheme(window,new Theme(theme.ToString()));
                if (window is ShellWindow)
                {
                    if ((window as ShellWindow) != null && ((window as ShellWindow).Content is SfNavigationDrawer) && ((window as ShellWindow).Content as SfNavigationDrawer) != null && (((window as ShellWindow).Content as SfNavigationDrawer).ContentView) as Frame != null)
                    {

                        SfSkinManager.SetTheme((((window as ShellWindow).Content as SfNavigationDrawer).ContentView) as Frame, new Theme(theme.ToString()));
						if ((((window as ShellWindow).Content as SfNavigationDrawer).ContentView as Frame).Content != null)
						{
							SfSkinManager.SetTheme((((window as ShellWindow).Content as SfNavigationDrawer).ContentView as Frame).Content as Page, new Theme(theme.ToString()));
						}                        
						if (themeNames == "MaterialDark" || themeNames == "Office2019HighContrast" || themeNames == "MaterialDarkBlue" || themeNames == "Office2019DarkGray" || themeNames == "Office2019Black" || themeNames == "Windows11Dark")
                        {
                            (window as ShellWindow)._ShellViewModel.UpdateFillColor(new SolidColorBrush(Colors.White));
                        }
                        else
                        {
                            (window as ShellWindow)._ShellViewModel.UpdateFillColor(new SolidColorBrush(Colors.Black));
                        }
                        SfSkinManager.SetTheme((window as ShellWindow).Content as SfNavigationDrawer, new Theme(theme.ToString()));
                    }
                }
            }
            App.Current.Properties["Theme"] = theme.ToString();

            return true;
        }

        public AppTheme GetCurrentTheme()
        {
            var themeName = App.Current.Properties["Theme"]?.ToString();
			if(themeName==null)
            {
                themeName = "Windows11Light";
            }
            Enum.TryParse(themeName, out AppTheme theme);
            return theme;
        }

        private void OnUserPreferenceChanging(object sender, UserPreferenceChangingEventArgs e)
        {
            if (e.Category == UserPreferenceCategory.Color ||
                e.Category == UserPreferenceCategory.VisualStyle)
            {
                SetTheme();
            }
        }
    }
}
