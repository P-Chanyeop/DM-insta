using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using MsBox.Avalonia.Enums;
using MsBox.Avalonia;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using System.Net.Http;
using System;

namespace Telegram_
{
    public partial class MainWindow : Window
    {
        bool apiKeySucess;
        string responseText;
        /*long PRODUCT_ID = 4;*/
        long PRODUCT_ID = 5;
        public MainWindow()
        {
            this.InitializeComponent();

            // 사이즈 조절 불가능하게 설정
            this.CanResize = false;

            /*var secondWindow = new naverDB();
            secondWindow.Show();*/

            // 메인윈도우 닫기
        }

        // API 키 입력란에 포커스를 얻거나 잃었을 때의 동작을 정의.
        private void TextBox_GotFocus(object? sender, GotFocusEventArgs e)
        {
            if (sender is TextBox textBox)
            {
                // 포커스를 얻었을 때의 동작
                textBox.Background = Avalonia.Media.Brush.Parse("#1E1E1E");
                textBox.Foreground = Avalonia.Media.Brush.Parse("#1E1E1E");
            }
        }

        private void TextBox_LostFocus(object? sender, RoutedEventArgs e)
        {
            if (sender is TextBox textBox)
            {
                // 포커스를 잃었을 때의 동작
                textBox.Background = Avalonia.Media.Brush.Parse("#1E1E1E");
                textBox.Foreground = Avalonia.Media.Brush.Parse("#FFFFFF");
            }
        }

        private async void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            string apiKey = api_key_input.Text ?? string.Empty;

            // API 키가 입력되지 않았을 경우 메시지박스를 띄웁니다.
            if (string.IsNullOrEmpty(apiKey))
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("API 키 입력", "API 키를 입력해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                return;
            }

            await Task.WhenAll(IsValidApiKey(apiKey));

            // API 키를 검증하는 로직을 추가합니다.
            if (apiKeySucess)
            {
                var jsonDoc = JsonDocument.Parse(responseText);
                string nickname = jsonDoc.RootElement.GetProperty("name").GetString();
                int remainDays = jsonDoc.RootElement.GetProperty("remainingDays").GetInt32();

                /*var messageBox = MessageBoxManager.GetMessageBoxStandard("로그인 성공", $"환영합니다 {nickname}님.", ButtonEnum.Ok, icon: MsBox.Avalonia.Enums.Icon.Success);*/
                var messageBox = MessageBoxManager.GetMessageBoxCustom(new MsBox.Avalonia.Dto.MessageBoxCustomParams
                {
                    ContentTitle = "로그인 성공",
                    ContentMessage = $"환영합니다 {nickname}님.",
                    ButtonDefinitions = new List<MsBox.Avalonia.Models.ButtonDefinition>
                    {
                        new MsBox.Avalonia.Models.ButtonDefinition
                        {
                            Name = "확인",
                            IsCancel = true,
                            IsDefault = true
                        }
                    },

                    Icon = MsBox.Avalonia.Enums.Icon.Success,
                    WindowStartupLocation = Avalonia.Controls.WindowStartupLocation.CenterOwner,
                    WindowIcon = new WindowIcon("./Assets/avalonia-logo.ico"),
                    CanResize = false,
                    MaxWidth = 400,
                    MaxHeight = 200,
                    ShowInCenter = true,
                    Topmost = true,
                });

                await messageBox.ShowWindowDialogAsync(this);
                // 로그인 성공 시 naverDB 창을 띄웁니다.
                var loginWindow = new Telegram_(apiKey, responseText);
                loginWindow.Show();

                // 현재 로그인 창을 닫습니다.
                this.Close();

                /*// API 키를 검증하는 로직을 추가합니다.
                if (IsValidApiKey(apiKey))
                {
                    // 로그인 성공 시 naverDB 창을 띄웁니다.
                    var loginWindow = new Telegram_(apiKey);
                    loginWindow.Show();

                    // 현재 로그인 창을 닫습니다.
                    this.Close();
                }
                else
                {
                    // 로그인 실패 시 메시지박스를 띄웁니다.
                    var messageBox = MessageBoxManager.GetMessageBoxStandard("로그인 실패.", "API 인증에 실패하였습니다. 다시 시도해주세요.", ButtonEnum.Ok);
                    await messageBox.ShowWindowDialogAsync(this);
                }*/
            }
            else
            {
                // 로그인 실패 시 메시지박스를 띄웁니다.
                /*var messageBox = MessageBoxManager.GetMessageBoxStandard("로그인 실패", "API 인증에 실패하였습니다. 다시 시도해주세요.", ButtonEnum.Ok, icon: MsBox.Avalonia.Enums.Icon.Error);*/
                var messageBox = MessageBoxManager.GetMessageBoxCustom(new MsBox.Avalonia.Dto.MessageBoxCustomParams
                {
                    ContentTitle = "로그인 실패",
                    ContentMessage = "API 인증에 실패하였습니다. 다시 시도해주세요.",
                    ButtonDefinitions = new List<MsBox.Avalonia.Models.ButtonDefinition>
                    {
                        new MsBox.Avalonia.Models.ButtonDefinition
                        {
                            Name = "확인",
                            IsCancel = true,
                            IsDefault = true
                        }
                    },

                    Icon = MsBox.Avalonia.Enums.Icon.Error,
                    WindowStartupLocation = Avalonia.Controls.WindowStartupLocation.CenterOwner,
                    WindowIcon = new WindowIcon("Assets/avalonia-logo.ico"),
                    CanResize = false,
                    MaxWidth = 400,
                    MaxHeight = 200,
                    ShowInCenter = true,
                    Topmost = true,
                });
                await messageBox.ShowWindowDialogAsync(this);
            }
        }

        private async Task IsValidApiKey(string apiKey)
        {
            // API 키 검증 로직 (실제 검증 로직을 구현)
            var handler = new HttpClientHandler() { UseCookies = true };
            using (var session = new HttpClient(handler))
            {
                // Step 4: Send the login request (GET)
                string loginEndpoint = $"https://softcat.co.kr/api/subscription/hash-key-auth?id={PRODUCT_ID}&hashKey={apiKey}";
                HttpResponseMessage loginResponse = await session.GetAsync(loginEndpoint);

                // Check the response status
                if (loginResponse.IsSuccessStatusCode)
                {
                    apiKeySucess = true;
                    Console.WriteLine("로그인 성공!");
                    responseText = await loginResponse.Content.ReadAsStringAsync();
                }
                else
                {
                    apiKeySucess = false;
                    Console.WriteLine("로그인 실패: " + loginResponse.StatusCode);
                    responseText = await loginResponse.Content.ReadAsStringAsync();
                    Console.WriteLine("응답 내용: " + responseText);
                }
            }
        }
    }
}