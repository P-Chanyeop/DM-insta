using System;
using System.Windows.Controls;
using Syncfusion.SfSkinManager;
using Syncfusion.Windows.Tools.Controls;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class BusyIndicatorPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public BusyIndicatorPage(BusyIndicatorViewModel viewModel)
        {
            InitializeComponent();		
            DataContext = viewModel;
			SfSkinManager.SetTheme(this, new Theme(themeName));
        }	
    }
}
