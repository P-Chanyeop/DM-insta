using Avalonia;
using Avalonia.ReactiveUI;
using Avalonia.WebView.Desktop;
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Avalonia.Threading;
using Microsoft.Win32;
using Avalonia.Controls;

namespace NaverWriting
{
    internal class Program
    {
        private static Window? splashWindow = null;

        [STAThread]
        public static void Main(string[] args)
        {
            //if (!IsWebView2RuntimeInstalled())
            //{
            //    string setupExe = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "MicrosoftEdgeWebView2Setup.exe");

            //    if (File.Exists(setupExe))
            //    {
            //        // 1. Splash 띄우기 (UI 별도 스레드)
            //        var splashThread = new Thread(() =>
            //        {
            //            var splashApp = AppBuilder.Configure<App>()
            //                .UsePlatformDetect()
            //                .WithInterFont()
            //                .UseReactiveUI()
            //                .UseDesktopWebView()
            //                .SetupWithoutStarting();

            //            splashWindow = new SplashWindow();
            //            splashWindow.Show();

            //            splashApp.Instance.Run(splashWindow);
            //        });

            //        splashThread.SetApartmentState(ApartmentState.STA);
            //        splashThread.Start();

            //        // 2. WebView2 설치 실행
            //        var process = new Process
            //        {
            //            StartInfo = new ProcessStartInfo
            //            {
            //                FileName = setupExe,
            //                Arguments = "/install /quiet /norestart",
            //                UseShellExecute = true,
            //                Verb = "runas" // 관리자 권한 요청
            //            }
            //        };

            //        process.Start();
            //        process.WaitForExit();

            //        // 3. 설치 끝났으면 SplashWindow 닫기 (UI Thread-safe)
            //        if (splashWindow != null)
            //        {
            //            // Replace the problematic line with the following:
            //            Dispatcher.UIThread.Post(() =>
            //            {
            //                splashWindow.Close();
            //            });
            //        }

            //        // 창이 닫힐 시간 소폭 대기
            //        Thread.Sleep(300);
            //    }
            //    else
            //    {
            //        // WebView2 설치 파일조차 없을 경우 메시지 박스로 안내
            //        System.Windows.Forms.MessageBox.Show(
            //            "WebView2 런타임이 설치되어 있지 않고 설치 파일도 없습니다.\nMicrosoft 공식 사이트에서 설치해주세요.",
            //            "WebView2 런타임 누락",
            //            System.Windows.Forms.MessageBoxButtons.OK,
            //            System.Windows.Forms.MessageBoxIcon.Error
            //        );
            //        return;
            //    }
            //}

            //// 앱 정상 실행
            //try
            //{
            //    BuildAvaloniaApp()
            //    .StartWithClassicDesktopLifetime(args);
            //} catch (Exception e)
            //{
            //    System.Windows.Forms.MessageBox.Show(
            //            "WebView2 런타임을 설치하는 도중 에러가 발생하였습니다.\nMicrosoft 공식 사이트에서 설치해주세요.",
            //            "WebView2 런타임 누락",
            //            System.Windows.Forms.MessageBoxButtons.OK,
            //            System.Windows.Forms.MessageBoxIcon.Error
            //        );

            //    return;
            //}

            BuildAvaloniaApp()
                .StartWithClassicDesktopLifetime(args);
        }

        private static bool IsWebView2RuntimeInstalled()
        {
            try
            {
                // 가장 확실한 방법: 실제 환경 생성 가능한지 확인
                var task = Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync();
                task.Wait(3000); // 최대 3초 대기

                return task.IsCompletedSuccessfully;
            }
            catch
            {
                return false;
            }
        }

        private static bool IsWebView2InKey(RegistryKey? key)
        {
            if (key == null) return false;

            foreach (var subkeyName in key.GetSubKeyNames())
            {
                using var subkey = key.OpenSubKey(subkeyName);
                var name = subkey?.GetValue("name")?.ToString();
                if (!string.IsNullOrEmpty(name) && name.Contains("WebView2 Runtime"))
                    return true;
            }

            return false;
        }

        public static AppBuilder BuildAvaloniaApp()
            => AppBuilder.Configure<App>()
                .UsePlatformDetect()
                .WithInterFont()
                .LogToTrace()
                .UseReactiveUI()
                .UseDesktopWebView();
    }
}
