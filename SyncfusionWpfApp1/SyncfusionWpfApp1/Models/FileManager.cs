using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;

using Syncfusion.Windows.Shared;

namespace SyncfusionWpfApp1
{
	public class FileManager : NotificationObject
    {
        private string fileName;
        private ImageSource imageIcon;
        private ObservableCollection<FileManager> subFiles;

        public ObservableCollection<FileManager> SubFiles
        {
            get { return subFiles; }
            set
            {
                subFiles = value;
                RaisePropertyChanged("SubFiles");
            }
        }

        public string ItemName
        {
            get { return fileName; }
            set
            {
                fileName = value;
                RaisePropertyChanged("ItemName");
            }
        }

        public ImageSource ImageIcon
        {
            get { return imageIcon; }
            set
            {
                imageIcon = value;
                RaisePropertyChanged("ImageIcon");
            }
        }
    }
}
