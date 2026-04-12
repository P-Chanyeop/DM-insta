using System.ComponentModel;
using System.Windows.Controls;
using Syncfusion.SfSkinManager;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class PropertyGridPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public PropertyGridPage(PropertyGridViewModel viewModel)
        {
            InitializeComponent();
            DataContext = viewModel;
			SfSkinManager.SetTheme(this, new Theme(themeName));
        }
    }
}
