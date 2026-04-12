using Avalonia.Media;
using CommunityToolkit.Mvvm.ComponentModel;
using ExCSS;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NaverWriting
{
    public partial class FontSizeViewModel : ObservableObject
    {
        // Font list
        [ObservableProperty]
        private IReadOnlyList<string> fonts;

        // Font size list
        [ObservableProperty]
        private IReadOnlyList<double> fontSizes;

        // Selected font (as string)
        [ObservableProperty]
        private string selectedFont;

        // Selected font size
        [ObservableProperty]
        private double selectedFontSize;

        // Selected font as FontFamily object
        public FontFamily SelectedFontFamily => new FontFamily(SelectedFont);

        public FontSizeViewModel()
        {
            // Initialize the font list with system fonts
            Fonts = FontManager.Current.SystemFonts.Select(x => x.Name).ToList();

            // Set default font sizes
            FontSizes = new List<double> { 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40 };

            // Set default selections
            SelectedFont = Fonts.FirstOrDefault() ?? "Arial";
            SelectedFontSize = FontSizes[1]; // Default to second font size (10pt)
        }

        // Notify when SelectedFont is changed
        partial void OnSelectedFontChanged(string value)
        {
            OnPropertyChanged(nameof(SelectedFontFamily));
        }
    }
}
