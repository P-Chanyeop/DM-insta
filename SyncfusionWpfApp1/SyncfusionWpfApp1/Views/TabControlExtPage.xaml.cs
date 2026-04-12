using System;
using System.Windows.Controls;
using Syncfusion.SfSkinManager;
using Syncfusion.Windows.Tools.Controls;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class TabControlExtPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public TabControlExtPage(TabControlExtViewModel viewModel)
        {
            InitializeComponent();			
            DataContext = viewModel;
			SfSkinManager.SetTheme(this, new Theme(themeName));
        }
		private void TabControlExt_NewButtonClick(object sender, EventArgs e)
        {
            TabItemExt item = new TabItemExt();
			int count = tabControlExt.Items.Count;
			count = count + 1;
			item.Header = "Item" + count;
			tabControlExt.Items.Add(item);
        }
    }
}
