using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SyncfusionWpfApp1
{
    public partial class FontViewModel : ObservableObject
    {
        // Property to store available fonts
        public IReadOnlyList<string> Fonts { get; }

        // Property to store selected font
        [ObservableProperty]
        private string selectedFont;

        // Constructor
        public FontViewModel()
        {
            // Get system fonts and order them alphabetically
            Fonts = FontManager.Current.SystemFonts.Select(f => f.Name).OrderBy(f => f).ToList();

            // Set a default font (e.g., the first one in the list)
            SelectedFont = Fonts.FirstOrDefault();
        }
    }
}
