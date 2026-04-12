using System;
using System.Windows.Controls;
using Syncfusion.SfSkinManager;
using Syncfusion.Windows.Controls.Grid;
using Syncfusion.Windows.Tools.Controls;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class GridControlPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public GridControlPage(GridControlViewModel viewModel)
        {
            InitializeComponent();			
            DataContext = viewModel;
			 //Specifying row and column count
            gridControl.Model.RowCount = 100;
            gridControl.Model.ColumnCount = 20;
			this.gridControl.QueryAllowDragColumn += GridControl_QueryAllowDragColumn;
            gridControl.Model.Options.AllowSelection = GridSelectionFlags.Any;
            gridControl.Model.Options.ListBoxSelectionMode = GridSelectionMode.One;
			gridControl.Model.Options.ExcelLikeSelectionFrame = true;
			//To set header row and column
            gridControl.Model.HeaderRows = 1;
            gridControl.Model.HeaderColumns = 1;
            //performing clipboard support
            //Copy cell data with style
            gridControl.Model.Options.CopyPasteOption |= CopyPaste.CopyCellData;
            //Cut cell data with style
            gridControl.Model.Options.CopyPasteOption |= CopyPaste.CutCell;
            //Paste cell data with style
            gridControl.Model.Options.CopyPasteOption |= CopyPaste.PasteCell;
			for (int i = 0; i < 100; i++)
            {
                for (int j = 0; j < 20; j++)
                {
                    gridControl.Model[i, j].CellValue = string.Format("{0}/{1}", i, j);
                }
            }
			SfSkinManager.SetTheme(this, new Theme(themeName));
        }	
		private void GridControl_QueryAllowDragColumn(object sender, GridQueryDragColumnHeaderEventArgs e)
        {
            //To disable dragging of First column
            if (e.Column == 0 && e.Reason == GridQueryDragColumnHeaderReason.HitTest)
                e.AllowDrag = false;
            //To disable dropping in First column
            if (e.InsertBeforeColumn == 0 &&
                 (e.Reason == GridQueryDragColumnHeaderReason.MouseUp || e.Reason == GridQueryDragColumnHeaderReason.MouseMove))
                e.AllowDrag = false;
        }
    }
}
