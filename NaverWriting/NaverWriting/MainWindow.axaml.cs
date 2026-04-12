using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using MsBox.Avalonia.Enums;
using MsBox.Avalonia;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text;
using System;
using System.Text.Json;
using System.Net.NetworkInformation;
using System.Linq;


namespace NaverWriting
{
    public partial class MainWindow : Window
    {
        bool apiKeySucess;
        bool macAddressSucess;
        string responseText;
        string macResponseText;
        /*long PRODUCT_ID = 4;*/
        long PRODUCT_ID = 7;

        public MainWindow()
        {
            InitializeComponent();

            // 사이즈 조절 불가능하게 설정
            this.CanResize = false;

            apiKeySucess = false;
            macAddressSucess = false;
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

            /*string nickname = "testuser";

            var loginWindow = new NaverWritingWindow(apiKey, nickname);
            loginWindow.Show();

            this.Close();*/
            // d49f35d1ff4578b97ec379de61c77a76
            await Task.WhenAll(IsValidApiKey(apiKey));



            // API 키를 검증하는 로직을 추가합니다.
            if (apiKeySucess)
            {
                string macAddress = GetMacAddress();
                await Task.WhenAll(IsValidMacAddress(apiKey));
                //using (var client = new System.Net.WebClient())
                //{
                //    client.Headers.Add("Content-Type", "application/json");
                //    var jsonPayload = JsonSerializer.Serialize(new 
                //    {
                //        macAddress = currentMacAddress,
                //        id = PRODUCT_ID,
                //        hashKey = apiKey
                //    });
                //    response = client.UploadString(serverUrl, "POST", jsonPayload);
                //    Console.WriteLine($"Server Response: {response}");
                //}

                var jsonDoc2 = JsonDocument.Parse(macResponseText);

                if (jsonDoc2.RootElement.GetProperty("result").GetString() == "fail")
                {
                    // 로그인 실패 시 메시지박스를 띄웁니다.
                    /*var messageBox = MessageBoxManager.GetMessageBoxStandard("로그인 실패", "API 인증에 실패하였습니다. 다시 시도해주세요.", ButtonEnum.Ok, icon: MsBox.Avalonia.Enums.Icon.Error);*/
                    var messageBox2 = MessageBoxManager.GetMessageBoxCustom(new MsBox.Avalonia.Dto.MessageBoxCustomParams
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
                        //WindowIcon = new WindowIcon("./Assets/avalonia-logo.ico"),
                        CanResize = false,
                        MaxWidth = 400,
                        MaxHeight = 200,
                        ShowInCenter = true,
                        Topmost = true,
                    });
                    await messageBox2.ShowWindowDialogAsync(this);
                }
                else
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
                        //WindowIcon = new WindowIcon("./Assets/avalonia-logo.ico"),
                        CanResize = false,
                        MaxWidth = 400,
                        MaxHeight = 200,
                        ShowInCenter = true,
                        Topmost = true,
                    });

                    await messageBox.ShowWindowDialogAsync(this);

                    // 로그인 성공 시 naverDB 창을 띄웁니다.
                    var loginWindow = new NaverWritingWindow(apiKey, responseText);
                    loginWindow.Show();

                    // 현재 로그인 창을 닫습니다.
                    this.Close();
                }
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
                    //WindowIcon = new WindowIcon("./Assets/avalonia-logo.ico"),
                    CanResize = false,
                    MaxWidth = 400,
                    MaxHeight = 200,
                    ShowInCenter = true,
                    Topmost = true,
                });
                await messageBox.ShowWindowDialogAsync(this);
            }
        }

        private string GetMacAddress()
        {
            var networkInterface = NetworkInterface.GetAllNetworkInterfaces()
            .FirstOrDefault(nic => nic.OperationalStatus == OperationalStatus.Up &&
                                   nic.NetworkInterfaceType != NetworkInterfaceType.Loopback);
            if (networkInterface == null)
                return "Unknown";

            return string.Join(":", networkInterface.GetPhysicalAddress()
                .GetAddressBytes()
                .Select(b => b.ToString("X2")));
        }

        private async Task IsValidApiKey(string apiKey)
        {
            // API 키 검증 로직 (실제 검증 로직을 구현)
            var handler = new HttpClientHandler() { UseCookies = true };
            using (var session = new HttpClient(handler))
            {
                // Step 4: Send the login request (GET)
                string loginEndpoint = $"http://13.209.199.124:8080/api/subscription/hash-key-auth/temp?id={PRODUCT_ID}&hashKey={apiKey}";
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

        private async Task IsValidMacAddress(string apiKey)
        {
            string macAddress = GetMacAddress();
            string macUpdateUrl = $"http://13.209.199.124:8080/api/subscription/verify-mac/temp?id={PRODUCT_ID}&hashKey={apiKey}&macAddress={macAddress}";

            var handler = new HttpClientHandler() { UseCookies = true };

            using (var session = new HttpClient(handler))
            {
                HttpResponseMessage macResponse = await session.PostAsync(macUpdateUrl, null);

                if (macResponse.IsSuccessStatusCode)
                {
                    macAddressSucess = true;
                    Console.WriteLine("MAC 주소 업데이트 성공");
                    macResponseText = await macResponse.Content.ReadAsStringAsync();
                }
                else
                {
                    macAddressSucess = false;
                    Console.WriteLine($"MAC 주소 업데이트 실패: {macResponse.StatusCode}");
                    macResponseText = await macResponse.Content.ReadAsStringAsync();
                    Console.WriteLine("응답 내용: " + macResponseText);
                }
            }
        }
    }
}