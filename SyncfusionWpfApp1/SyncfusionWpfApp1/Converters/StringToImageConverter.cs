using System;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Windows.Controls;
using System.Windows.Data;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1.Converters
{
    public class StringToImageConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            if (value != null)
            {
                string str = value.ToString();

                if (str == "Sufficient")
                    return @"Assets/Sufficient.png";
                else if (str == "Insufficient")
                    return @"Assets/Insufficient.png";
                else if (str == "Perfect")
                    return @"Assets/Perfect.png";
            }
            return null;
        }

        public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
