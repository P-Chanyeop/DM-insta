using System;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using Syncfusion.SfSkinManager;
using Syncfusion.Windows.Tools.Controls;
using SyncfusionWpfApp1.ViewModels;
namespace SyncfusionWpfApp1.Views
{
    public partial class PdfViewerPage : Page
    {
		public string themeName = App.Current.Properties["Theme"]?.ToString()!= null? App.Current.Properties["Theme"]?.ToString(): "Windows11Light";
        public PdfViewerPage(PdfViewerViewModel viewModel)
        {
            InitializeComponent();		
            DataContext = viewModel;
			String path = AppDomain.CurrentDomain.BaseDirectory;
            path = path + "Assets/FormFillingDocument.pdf";
            pdfViewer.Load(path);
			SfSkinManager.SetTheme(this, new Theme(themeName));
        }	
		private void ExportImage_Click(object sender, RoutedEventArgs e)
        {
            //Export the particular PDF page as image at the page index of 0
            BitmapSource image = pdfViewer.ExportAsImage(0);
            //Set up the output path
            string output = @"..\..\Image";
            if (image != null)
            {
                //Initialize the new Jpeg bitmap encoder
                BitmapEncoder encoder = new JpegBitmapEncoder();
                //Create the bitmap frame using the bitmap source and add it to the encoder
                encoder.Frames.Add(BitmapFrame.Create(image));
                //Create the file stream for the output in the desired image format
                FileStream stream = new FileStream(output + ".Jpeg", FileMode.Create);
                //Save the stream, so that the image will be generated in the output location
                encoder.Save(stream);
            }
        }
    }
}
