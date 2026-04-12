using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Data;

using Syncfusion.Windows.Shared;

namespace SyncfusionWpfApp1
{
    public class BookModel:NotificationObject
    {
        private string bookID;
        public string BookID
        {
            get
            {
                return bookID;
            }
            set
            {
                bookID = value;
                this.RaisePropertyChanged("BookID");
            }
        }
        private string bookName;
        public string BookName
        {
            get
            {
                return bookName;
            }
            set
            {
                bookName = value;
                this.RaisePropertyChanged("BookName");
            }
        }

        private string author;
        public string AuthorName
        {
            get
            {
                return author;
            }
            set
            {
                author = value;
                this.RaisePropertyChanged("AuthorName");
            }
        }


        private string genre;
        public string Genre
        {
            get
            {
                return genre;
            }
            set
            {
                genre = value;
                this.RaisePropertyChanged("Genre");
            }
        }

        private string price;
        public string Price
        {
            get
            {
                return price;
            }
            set
            {
                price = value;
                this.RaisePropertyChanged("Price");
            }
        }

        private string publishdate;
        public string PublishDate
        {
            get
            {
                return publishdate;
            }
            set
            {
                publishdate = value;
                this.RaisePropertyChanged("PublishDate");
            }
        }

        private string description;
        public string Description
        {
            get
            {
                return description;
            }
            set
            {
                description = value;
                this.RaisePropertyChanged("Description");
            }
        }
    }
	public class PrefixSuffixConverter : DependencyObject, IValueConverter
    {
        public string PrefixString
        {
            get { return (string)GetValue(PrefixStringProperty); }
            set { SetValue(PrefixStringProperty, value); }
        }

        public static readonly DependencyProperty PrefixStringProperty =
            DependencyProperty.Register("PrefixString", typeof(string), typeof(PrefixSuffixConverter), new PropertyMetadata(string.Empty));

        public string SuffixString
        {
            get { return (string)GetValue(SuffixStringProperty); }
            set { SetValue(SuffixStringProperty, value); }
        }

        public static readonly DependencyProperty SuffixStringProperty =
            DependencyProperty.Register("SuffixString", typeof(string), typeof(PrefixSuffixConverter), new PropertyMetadata(string.Empty));

        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value == null)
                return string.Empty;

            return PrefixString + value.ToString() + SuffixString;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
