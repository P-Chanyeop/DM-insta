using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;

namespace WpfApp1.ViewModel
{
    public class FontViewModel : INotifyPropertyChanged
    {
        private ObservableCollection<string> _fonts;
        private string _selectedFont;

        public ObservableCollection<string> Fonts
        {
            get => _fonts;
            set
            {
                _fonts = value;
                OnPropertyChanged();
            }
        }

        public string SelectedFont
        {
            get => _selectedFont;
            set
            {
                _selectedFont = value;
                OnPropertyChanged();
            }
        }

        public FontViewModel()
        {
            Fonts = new ObservableCollection<string>();
            LoadSystemFonts();

            SelectedFont = Fonts.FirstOrDefault();
        }

        // 시스템 폰트 로드
        private void LoadSystemFonts()
        {
            foreach (var fontFamily in System.Windows.Media.Fonts.SystemFontFamilies)
            {
                Fonts.Add(fontFamily.Source);
            }
            
            // 모든 한글 폰트도 포함
            Fonts.Add("맑은 고딕");
            Fonts.Add("굴림");
            Fonts.Add("바탕");
            Fonts.Add("돋움");
            Fonts.Add("궁서");

            Fonts = new ObservableCollection<string>(Fonts.OrderBy(f => f));
        }

        public event PropertyChangedEventHandler PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
