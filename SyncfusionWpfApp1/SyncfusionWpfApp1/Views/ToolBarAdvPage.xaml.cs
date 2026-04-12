using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Syncfusion.SfSkinManager;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class ToolBarAdvPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public ToolBarAdvPage(ToolBarAdvViewModel viewModel)
        {
            InitializeComponent();
            DataContext = viewModel;
			SfSkinManager.SetTheme(this, new Theme(themeName));
        }
    }
}
