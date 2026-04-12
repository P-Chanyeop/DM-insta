using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.Windows.Data;
using System.Windows.Media;
using System.Windows.Media.Imaging;

using Syncfusion.Windows.Shared;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1
{
 
	  public class TreeViewViewModel : Observable
    {
        private ObservableCollection<FileManager> imageNodeInfo;

        private ObservableCollection<object> checkedFileName;

        public ObservableCollection<object> CheckedFileName
        {
            get { return checkedFileName; }
            set { checkedFileName = value; RaisePropertyChanged("CheckedFileName"); }
        }

        public TreeViewViewModel()
        {
            GenerateSource();
        }

        public ObservableCollection<FileManager> ImageNodeInfo
        {
            get { return imageNodeInfo; }
            set { this.imageNodeInfo = value; RaisePropertyChanged("ImageNodeInfo"); }
        }
        private void GenerateSource()
        {
            var nodeImageInfo = new ObservableCollection<FileManager>();
            checkedFileName = new ObservableCollection<object>();
            var doc = new FileManager() { ItemName = "Documents", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_folder.png")) };
            var download = new FileManager() { ItemName = "Downloads", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_folder.png")) };
            var mp3 = new FileManager() { ItemName = "Music", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1   ;component/Icons/treeview_folder.png")) };
            var pictures = new FileManager() { ItemName = "Pictures", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_folder.png")) };
            var video = new FileManager() { ItemName = "Videos", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_folder.png")) };

            var pollution = new FileManager() { ItemName = "Environmental Pollution.docx", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_word.png")) };
            var globalWarming = new FileManager() { ItemName = "Global Warming.ppt", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_ppt.png")) };
            var sanitation = new FileManager() { ItemName = "Sanitation.docx", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_word.png")) };
            var socialNetwork = new FileManager() { ItemName = "Social Network.pdf", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_pdf.png")) };
            var youthEmpower = new FileManager() { ItemName = "Youth Empowerment.pdf", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_pdf.png")) };

            var games = new FileManager() { ItemName = "Game.exe", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_exe.png")) };
            var tutorials = new FileManager() { ItemName = "Tutorials.zip", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_zip.png")) };
            var TypeScript = new FileManager() { ItemName = "TypeScript.7z", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_zip.png")) };
            var uiGuide = new FileManager() { ItemName = "UI-Guide.pdf", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_pdf.png")) };

            var song = new FileManager() { ItemName = "Goutiest", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_mp3.png")) };

            var camera = new FileManager() { ItemName = "Camera Roll", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_folder.png")) };
            var stone = new FileManager() { ItemName = "Stone.jpg", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_png.png")) };
            var wind = new FileManager() { ItemName = "Wind.jpg", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_png.png")) };

            var img0 = new FileManager() { ItemName = "WIN_20160726_094117.JPG", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_img0.png")) };
            var img1 = new FileManager() { ItemName = "WIN_20160726_094118.JPG", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_img1.png")) };

            var video1 = new FileManager() { ItemName = "Naturals.mp4", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_video.png")) };
            var video2 = new FileManager() { ItemName = "Wild.mpg", ImageIcon = new BitmapImage(new Uri("pack://application:,,,/SyncfusionWpfApp1;component/Icons/treeview_video.png")) };

            doc.SubFiles = new ObservableCollection<FileManager>
      {
         pollution,
         globalWarming,
         sanitation,
         socialNetwork,
         youthEmpower
      };

            download.SubFiles = new ObservableCollection<FileManager>
      {
         games,
         tutorials,
         TypeScript,
         uiGuide
      };

            mp3.SubFiles = new ObservableCollection<FileManager>
      {
         song
      };

            pictures.SubFiles = new ObservableCollection<FileManager>
      {
         camera,
         stone,
         wind
      };

            camera.SubFiles = new ObservableCollection<FileManager>
      {
         img0,
         img1
      };
            video.SubFiles = new ObservableCollection<FileManager>
      {
         video1,
         video2
      };

            nodeImageInfo.Add(doc);
            nodeImageInfo.Add(download);
            nodeImageInfo.Add(mp3);
            nodeImageInfo.Add(pictures);
            nodeImageInfo.Add(video);
            imageNodeInfo = nodeImageInfo;

            checkedFileName.Add(pollution);
            checkedFileName.Add(sanitation);
            checkedFileName.Add(video1);
            checkedFileName.Add(tutorials);

        }
    }
 
}
