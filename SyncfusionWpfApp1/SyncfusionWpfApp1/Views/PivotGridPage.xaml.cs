using System;
using System.Windows;
using System.Windows.Controls;
using Syncfusion.SfSkinManager;
using Syncfusion.Windows.Tools.Controls;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class PivotGridPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public PivotGridPage(PivotGridViewModel viewModel)
        {
            InitializeComponent();		
            DataContext = viewModel;
			pivotGrid.Loaded += PivotGrid_Loaded;
			SfSkinManager.SetTheme(this, new Theme(themeName));
        }	
		private void PivotGrid_Loaded(object sender, RoutedEventArgs e)
        {
            pivotGrid.EditManager.AllowEditingOfTotalCells = true;
        }
    }
}
