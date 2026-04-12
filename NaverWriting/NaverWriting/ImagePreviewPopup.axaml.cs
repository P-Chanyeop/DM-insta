using Avalonia;
using Avalonia.Controls;
using Avalonia.Markup.Xaml;

namespace NaverWriting;

public partial class ImagePreviewPopup : Window
{
    string imagePath;

    public ImagePreviewPopup() : this("")
    {
        
    }

    public ImagePreviewPopup(string path)
    {
        InitializeComponent();
        imagePath = path;

        PreviewImage.Source = new Avalonia.Media.Imaging.Bitmap(path);
    }
}