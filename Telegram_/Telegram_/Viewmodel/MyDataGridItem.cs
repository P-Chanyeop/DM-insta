using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;

namespace Telegram_.Viewmodel
{
    public class MyDataGridItem : INotifyPropertyChanged
    {
        private string _이미지;

        public string 이미지
        {
            get => _이미지;
            set
            {
                _이미지 = value;
                OnPropertyChanged(nameof(이미지));
            }
        }

        public event PropertyChangedEventHandler? PropertyChanged;

        protected void OnPropertyChanged(string propertyName)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
