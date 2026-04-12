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
    public class FontSizeViewModel : INotifyPropertyChanged
    {
        private ObservableCollection<int> _fontSizes;
        private int _selectedFontSize; // 타입을 int로 수정

        public ObservableCollection<int> FontSizes
        {
            get => _fontSizes;
            set
            {
                _fontSizes = value;
                OnPropertyChanged();
            }
        }

        public int SelectedFontSize // 타입을 int로 수정
        {
            get => _selectedFontSize;
            set
            {
                _selectedFontSize = value;
                OnPropertyChanged();
            }
        }

        public FontSizeViewModel()
        {
            FontSizes = new ObservableCollection<int>();
            LoadFontSize();

            // FirstOrDefault는 null을 반환할 수 있으므로, 첫 번째 값으로 초기화
            SelectedFontSize = FontSizes.FirstOrDefault();
        }

        // 폰트 사이즈 로드
        private void LoadFontSize()
        {
            // 자주 사용하는 폰트 크기 추가
            var sizes = new[]
            {
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
                23, 24, 32, 36, 48, 72, 96
            };

            foreach (var size in sizes.OrderBy(f => f))
            {
                FontSizes.Add(size);
            }
        }

        public event PropertyChangedEventHandler PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
