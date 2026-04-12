using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Media.Imaging;
using Avalonia.Platform;
using System;
using System.Diagnostics;
using System.Reflection;

namespace Datalab_
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        // 마이페이지 이동
        private void Manage_MyPage(object sender, RoutedEventArgs e)
        {
            // 마이페이지 페이지로 이동
            Process.Start(new ProcessStartInfo
            {
                FileName = "http://softcat.co.kr:8080/mypage",
                UseShellExecute = true
            });
        }

        // 문의하기 이동
        private void Manage_QnA(object sender, RoutedEventArgs e)
        {
            // 구독 관리 페이지로 이동
            Process.Start(new ProcessStartInfo
            {
                FileName = "http://softcat.co.kr:8080/apply/entry",
                UseShellExecute = true
            });
        }
    }
}