using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Windows.Input;
using System.Windows.Media;
using System.Xml;

using Microsoft.Extensions.Options;

using Syncfusion.SfSkinManager;
using Syncfusion.Windows.Tools.Controls;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Contracts.ViewModels;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1.ViewModels
{
    // TODO WTS: Change the URL for your privacy policy in the appsettings.json file, currently set to https://YourPrivacyUrlGoesHere
    public class SettingsViewModel : Observable, INavigationAware
    {
        public static ObservableCollection<Palette> palettesLists = new ObservableCollection<Palette>();
        public static string selectpalette = string.Empty;
        private readonly AppConfig _appConfig;
        private readonly IThemeSelectorService _themeSelectorService;
        private readonly ISystemService _systemService;
        private readonly IApplicationInfoService _applicationInfoService;
        private AppTheme _theme;
        private string _versionDescription;
        private int _selectedIndex;
        private ComboBoxItemAdv _selectedTheme;
        private ICommand _setThemeCommand;
        private ICommand _privacyStatementCommand;

        public AppTheme Theme
        {
            get { return _theme; }
            set { Set(ref _theme, value); }
        }

        public string VersionDescription
        {
            get { return _versionDescription; }
            set { Set(ref _versionDescription, value); }
        }
		
		public ComboBoxItemAdv SelectedTheme
        {
            get { return _selectedTheme; }
            set
            {
                Set(ref _selectedTheme, value);
                if (SelectedTheme.Content == "Material Dark" || SelectedTheme.Content == "Office 2019 High Contrast" || SelectedTheme.Content == "Material Dark Blue" || SelectedTheme.Content == "Office 2019 Black" || SelectedTheme.Content == "Windows11 Dark")
                {
                    BorderColor = new SolidColorBrush(Colors.White);
                }
                else
                {
                    BorderColor = new SolidColorBrush(Colors.Black);
                }
            }
        }
		
		public int SelectedIndexValue
        {
            get { return _selectedIndex; }
            set { Set(ref _selectedIndex, value); }
        }

        private ObservableCollection<Palette> palettes;
        public ObservableCollection<Palette> Palettes
        {
            get { return palettes; }
            set { palettes = value; RaisePropertyChanged("Palettes"); }
        }

        private Palette selectedpalette;
        public Palette SelectedPalette
        {
            get
            {
                if (selectedpalette != null)
                {
                    selectpalette = selectedpalette.Name;
                }
                return selectedpalette;
            }
            set
            {
                selectedpalette = value;
                if (SelectedPalette != null && SelectedPalette.Name != null)
                {
                    OnPaletteChanged(SelectedTheme.Content.ToString().Replace(" ", ""));
                }
                RaisePropertyChanged("SelectedPalette");
            }
        }

        private SolidColorBrush borderColor;

        public SolidColorBrush BorderColor
        {
            get { return borderColor; }
            set
            {
                borderColor = value;
                OnPropertyChanged(nameof(BorderColor)); // Implement INotifyPropertyChanged
            }
        }

        public ICommand SetThemeCommand => _setThemeCommand ?? (_setThemeCommand = new RelayCommand<string>(OnSetTheme));

        public ICommand PrivacyStatementCommand => _privacyStatementCommand ?? (_privacyStatementCommand = new RelayCommand(OnPrivacyStatement));

        public SettingsViewModel(IOptions<AppConfig> appConfig, IThemeSelectorService themeSelectorService, ISystemService systemService, IApplicationInfoService applicationInfoService)
        {
            _appConfig = appConfig.Value;
            _themeSelectorService = themeSelectorService;
			string currentTheme = _themeSelectorService.GetCurrentTheme().ToString();
			 string appliedTheme = string.Empty;
            if(currentTheme!=null)
            {
                foreach (var themes in ThemeList.GetThemeList())
                {
                    if(themes.Replace(" ","").Equals(currentTheme))
                    {
                        appliedTheme = themes;
                        break;
                    }
                }
            }
            else
            {
                currentTheme = "Windows11Light";
                appliedTheme = "Windows11 Light";
            }
            SelectedTheme = new ComboBoxItemAdv()
            {
                Content = appliedTheme,
            };
			Enum.TryParse(currentTheme, out AppTheme theme);
            SelectedIndexValue = ((int)theme);
            _systemService = systemService;
            _applicationInfoService = applicationInfoService;
            PopulatePaletteList();
            FilterItemsBySelection();
        }

        public void OnNavigatedTo(object parameter)
        {
            VersionDescription = $"SyncfusionWpfApp1 - {_applicationInfoService.GetVersion()}";
            var theme = (AppTheme)Enum.Parse(typeof(AppTheme), SelectedTheme.Content.ToString().Replace(" ",""));
            _themeSelectorService.SetTheme(theme);
        }

        public void OnNavigatedFrom()
        {
        }

         private void OnSetTheme(string themeName)
        {
            FilterItemsBySelection();
            if (themeName == null)
            {
                var theme = (AppTheme)Enum.Parse(typeof(AppTheme), SelectedTheme.Content.ToString().Replace(" ",""));
                _themeSelectorService.SetTheme(theme);
            }
            else
            {
                var theme = (AppTheme)Enum.Parse(typeof(AppTheme), themeName);
                _themeSelectorService.SetTheme(theme);
            }
        }

        private void OnPrivacyStatement()
            => _systemService.OpenInWebBrowser(_appConfig.PrivacyStatement);
        private List<Palette> PaletteList = new List<Palette>();
        void PopulatePaletteList()
        {
            var paletteDetails = new List<Palette>();
            Palettes = new ObservableCollection<Palette>();
            String path = AppDomain.CurrentDomain.BaseDirectory;
            path = path + @"Models/PaletteList.xml";
            var xml = File.ReadAllText(path);
            XmlDocument Doc = new XmlDocument();
            Doc.LoadXml(xml);
            XmlNodeList xmlnode = Doc.GetElementsByTagName("Palettes");

            for (int i = 0; i <= xmlnode.Count - 1; i++)
            {
                foreach (var node in xmlnode[i].ChildNodes)
                {
                    var element = node as XmlElement;
                    string name = null, theme = null, primaryBackground = null, primaryForeground = null, primaryBackgroundAlt = null, displayname = null, primaryBorderColor = null;

                    if (element == null || element.Attributes.Count <= 0)
                        continue;

                    name = element.HasAttribute("Name") ? element.Attributes["Name"].Value : string.Empty;
                    theme = element.HasAttribute("Theme") ? element.Attributes["Theme"].Value : string.Empty;

                    primaryBackground = element.HasAttribute("PrimaryBackground") ? element.Attributes["PrimaryBackground"].Value : string.Empty;
                    primaryForeground = element.HasAttribute("PrimaryForeground") ? element.Attributes["PrimaryForeground"].Value : string.Empty;
                    primaryBackgroundAlt = element.HasAttribute("PrimaryBackgroundAlt") ? element.Attributes["PrimaryBackgroundAlt"].Value : string.Empty;
                    displayname = element.HasAttribute("DisplayName") ? element.Attributes["DisplayName"].Value : string.Empty;
                    primaryBorderColor = element.HasAttribute("PrimaryBorderColor") ? element.Attributes["PrimaryBorderColor"].Value : string.Empty;
                    var palette = new Palette()
                    {
                        Name = name,
                        Theme = theme,
                        DisplayName = displayname,
                        PrimaryBackground = (Brush)new BrushConverter().ConvertFromString(primaryBackground),
                        PrimaryForeground = (Brush)new BrushConverter().ConvertFromString(primaryForeground),
                        PrimaryBackgroundAlt = (Brush)new BrushConverter().ConvertFromString(primaryBackgroundAlt),
                        PrimaryBorderColor = (Brush)new BrushConverter().ConvertFromString(primaryBorderColor)
                    };
                    paletteDetails.Add(palette);
                }
            }
            PaletteList = paletteDetails;

        }

        private void FilterItemsBySelection()
        {
            Palettes.Clear();
            foreach (var item in PaletteList)
            {
                if (item.Theme == SelectedTheme.Content.ToString().Replace(" ", ""))
                {
                    Palettes.Add(item);
                }

            }
            if (SelectedPalette == null && palettesLists.Count == 0)  /*&& SelectedPalette.Theme == SelectedTheme.Content.ToString().Replace(" ", "") && palettesLists != null)*/
            {
                SelectedPalette = Palettes[0];
                palettesLists = Palettes;
            }
            else
            //if (selectpalette != string.Empty && palettesLists.Count != 0)
            {
                int foundIndex = -1;
                for (int i = 0; i < Palettes.Count; i++)
                {
                    if (Palettes[i].Name == selectpalette)
                    {
                        foundIndex = i;
                        SelectedPalette = Palettes[foundIndex];
                        break;
                    }
                }
            }
        }

        void OnPaletteChanged(string ThemeName)
        {
            switch (ThemeName)
            {
                case "Windows11Light":
                    {
                        changePalette("Syncfusion.Themes.Windows11Light.WPF.Windows11LightThemeSettings, Syncfusion.Themes.Windows11Light.WPF", "Syncfusion.Themes.Windows11Light.WPF.Windows11Palette, Syncfusion.Themes.Windows11Light.WPF", ThemeName);
                        break;
                    }
                case "Windows11Dark":
                    {
                        changePalette("Syncfusion.Themes.Windows11Dark.WPF.Windows11DarkThemeSettings, Syncfusion.Themes.Windows11Dark.WPF", "Syncfusion.Themes.Windows11Dark.WPF.Windows11Palette, Syncfusion.Themes.Windows11Dark.WPF", ThemeName);
                        break;
                    }
                case "FluentLight":
                    {
                        changePalette("Syncfusion.Themes.FluentLight.WPF.FluentLightThemeSettings, Syncfusion.Themes.FluentLight.WPF", "Syncfusion.Themes.FluentLight.WPF.FluentPalette, Syncfusion.Themes.FluentLight.WPF", ThemeName);
                        break;
                    }
                case "FluentDark":
                    {
                        changePalette("Syncfusion.Themes.FluentDark.WPF.FluentDarkThemeSettings, Syncfusion.Themes.FluentDark.WPF", "Syncfusion.Themes.FluentDark.WPF.FluentPalette, Syncfusion.Themes.FluentDark.WPF", ThemeName);
                        break;
                    }
                case "MaterialLight":
                    {
                        changePalette("Syncfusion.Themes.MaterialLight.WPF.MaterialLightThemeSettings, Syncfusion.Themes.MaterialLight.WPF", "Syncfusion.Themes.MaterialLight.WPF.MaterialPalette, Syncfusion.Themes.MaterialLight.WPF", ThemeName);
                        break;
                    }
                case "MaterialLightBlue":
                    {
                        changePalette("Syncfusion.Themes.MaterialLightBlue.WPF.MaterialLightBlueThemeSettings, Syncfusion.Themes.MaterialLightBlue.WPF", "Syncfusion.Themes.MaterialLightBlue.WPF.MaterialPalette, Syncfusion.Themes.MaterialLightBlue.WPF", ThemeName);
                        break;
                    }
                case "MaterialDark":
                    {
                        changePalette("Syncfusion.Themes.MaterialDark.WPF.MaterialDarkThemeSettings, Syncfusion.Themes.MaterialDark.WPF", "Syncfusion.Themes.MaterialDark.WPF.MaterialPalette, Syncfusion.Themes.MaterialDark.WPF", ThemeName);
                        break;
                    }
                case "MaterialDarkBlue":
                    {
                        changePalette("Syncfusion.Themes.MaterialDarkBlue.WPF.MaterialDarkBlueThemeSettings, Syncfusion.Themes.MaterialDarkBlue.WPF", "Syncfusion.Themes.MaterialDarkBlue.WPF.MaterialPalette, Syncfusion.Themes.MaterialDarkBlue.WPF", ThemeName);
                        break;
                    }
                case "Office2019Colorful":
                    {
                        changePalette("Syncfusion.Themes.Office2019Colorful.WPF.Office2019ColorfulThemeSettings, Syncfusion.Themes.Office2019Colorful.WPF", "Syncfusion.Themes.Office2019Colorful.WPF.Office2019Palette, Syncfusion.Themes.Office2019Colorful.WPF", ThemeName);
                        break;
                    }
                case "Office2019Black":
                    {
                        changePalette("Syncfusion.Themes.Office2019Black.WPF.Office2019BlackThemeSettings, Syncfusion.Themes.Office2019Black.WPF", "Syncfusion.Themes.Office2019Black.WPF.Office2019Palette, Syncfusion.Themes.Office2019Black.WPF", ThemeName);
                        break;
                    }
                case "Office2019White":
                    {
                        changePalette("Syncfusion.Themes.Office2019White.WPF.Office2019WhiteThemeSettings, Syncfusion.Themes.Office2019White.WPF", "Syncfusion.Themes.Office2019White.WPF.Office2019Palette, Syncfusion.Themes.Office2019White.WPF", ThemeName);
                        break;
                    }
                case "Office2019DarkGray":
                    {
                        changePalette("Syncfusion.Themes.Office2019DarkGray.WPF.Office2019DarkGrayThemeSettings, Syncfusion.Themes.Office2019DarkGray.WPF", "Syncfusion.Themes.Office2019DarkGray.WPF.Office2019Palette, Syncfusion.Themes.Office2019DarkGray.WPF", ThemeName);
                        break;

                    }
                case "Office2019HighContrast":
                    {
                        changePalette("Syncfusion.Themes.Office2019HighContrast.WPF.Office2019HighContrastThemeSettings, Syncfusion.Themes.Office2019HighContrast.WPF", "Syncfusion.Themes.Office2019HighContrast.WPF.HighContrastPalette, Syncfusion.Themes.Office2019HighContrast.WPF", ThemeName);
                        break;
                    }
                case "Office2019HighContrastWhite":
                    {
                        changePalette("Syncfusion.Themes.Office2019HighContrastWhite.WPF.Office2019HighContrastWhiteThemeSettings, Syncfusion.Themes.Office2019HighContrastWhite.WPF", "Syncfusion.Themes.Office2019HighContrastWhite.WPF.HighContrastPalette, Syncfusion.Themes.Office2019HighContrastWhite.WPF", ThemeName);
                        break;
                    }
            }
        }

        private void changePalette(string themeType, string paletteType, string theme)
        {
            object themeSettings = Activator.CreateInstance(Type.GetType(themeType));
            themeSettings.GetType().GetRuntimeProperty("Palette").SetValue(themeSettings, Enum.Parse(Type.GetType(paletteType), SelectedPalette.Name));
            SfSkinManager.RegisterThemeSettings(theme, (IThemeSetting)themeSettings);
            var currenttheme = (AppTheme)Enum.Parse(typeof(AppTheme), SelectedTheme.Content.ToString().Replace(" ", ""));
            _themeSelectorService.SetTheme(currenttheme);
        }
    }
}
