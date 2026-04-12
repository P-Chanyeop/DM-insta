using System.Windows;
using System.Windows.Controls;
using Syncfusion.SfSkinManager;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class DockingManagerPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public DockingManagerPage(DockingManagerViewModel viewModel)
        {
            InitializeComponent();
            DataContext = viewModel;
			SfSkinManager.SetTheme(this, new Syncfusion.SfSkinManager.Theme(themeName));
        }
		 private void dockingManager_Loaded(object sender, RoutedEventArgs e)
        {
            dockingManager.LoadDockState();
        }
    }
}
