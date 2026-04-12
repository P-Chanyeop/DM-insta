using System;
using System.Windows.Controls;
using Syncfusion.SfSkinManager;
using Syncfusion.Windows.Tools.Controls;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class SpreadsheetPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public SpreadsheetPage(SpreadsheetViewModel viewModel)
        {
            InitializeComponent();			
            DataContext = viewModel;
			spreadsheet.DefaultRowCount = 50;
            spreadsheet.DefaultColumnCount = 50;
            this.spreadsheet.WorkbookLoaded += Spreadsheet_WorkbookLoaded;
			SfSkinManager.SetTheme(this, new Theme(themeName));
        }		
		private void Spreadsheet_WorkbookLoaded(object sender, Syncfusion.UI.Xaml.Spreadsheet.Helpers.WorkbookLoadedEventArgs args)
        {
            for (int row = 1; row <= 20; row++)
            {
                for (int col = 1; col <= 25; col++)
                {
                    var range = spreadsheet.ActiveSheet.Range[row, col]; 
                    int value = row * col;
                    spreadsheet.ActiveGrid.SetCellValue(range, value.ToString());
                }
            }
            spreadsheet.ActiveGrid.AllowSelection = true;
            spreadsheet.ActiveGrid.AllowEditing = true;
            //To hide the Header cells visibility
            spreadsheet.SetRowColumnHeadersVisibility(true);
            spreadsheet.ActiveGrid.FrozenRows = 5;
							spreadsheet.ActiveGrid.FrozenColumns = 5;
        }
    }
}
