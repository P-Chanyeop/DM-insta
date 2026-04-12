using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using MsBox.Avalonia.Enums;
using MsBox.Avalonia;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Threading.Tasks;
using Telegram.Bot.Types;
using WTelegram;
using Avalonia.Threading;
using static System.Runtime.InteropServices.JavaScript.JSType;
using TL;
using Avalonia;
using System.Linq;
using System.IO;
using MsBox.Avalonia.Base;
using System.Text.Json;
using Telegram_.Viewmodel;
using Newtonsoft.Json;


namespace Telegram_;

public partial class Telegram_ : Window
{
    bool login_flag = false;
    bool workFlag = false;
    string apiId = "25396172";
    string apiHash = "ac66e857ca8046d1eaa68582f357241c";
    string phoneNumber;
    Client client;
    Messages_Dialogs dialogs;
    // imagePath = C:\Users\IRENE_XD\Downloads\trash2.png

    public ObservableCollection<DB_data> Data_ { get; set; }

    public class DB_data
    {
        public long chatId { get; set; }
        public string 채널명 { get; set; }
        public string 메세지 { get; set; }
        public string 이미지 { get; set; }
        public string 간격 { get; set; }

        public DB_data(long chatId, string userName, string message, string imagePath, string interval)
        {
            this.chatId = chatId;
            this.채널명 = userName;
            this.메세지 = message;
            this.이미지 = imagePath;
            this.간격 = interval;
        }
    }

    public Telegram_()
    {
        
    }

    public Telegram_(string apiKey, string responseText)
    {
        this.InitializeComponent();

        var jsonDoc = JsonDocument.Parse(responseText);
        string nickname = jsonDoc.RootElement.GetProperty("name").GetString();
        int remainDays = jsonDoc.RootElement.GetProperty("remainingDays").GetInt32();

        // 닉네임 설정
        NICKNAME.Text = nickname;

        // 구독개월 수 설정. 30일 이상이면 개월 수로, 30일 미만이면 일 수로 표시
        if (remainDays >= 30)
        {
            this.SUB_REMAIN_TEXT.Text = (remainDays / 30) + "개월";
        }
        else
        {
            this.SUB_REMAIN_TEXT.Text = remainDays + "일";

        }
        AddLog("프로그램이 정상 실행되었습니다.");
        var data_ = new List<DB_data>
        {
            // 예시 데이터
            new DB_data(-1L, "채널1", "", "", "10"),
            new DB_data(1L, "채널2", "", "", "10"),
            new DB_data(1L, "채널3", "", "", "10"),
        };
        Data_ = new ObservableCollection<DB_data>(data_);
        // DataGrid에 바인딩
        DataContext = this;

        // 사이즈 조절 불가능하게 설정
        this.CanResize = false;

        LoadSettings();
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

    // 로그아웃 기능
    private void Logout(object sender, RoutedEventArgs e)
    {
        // 로그아웃
        // 윈도우 종료 후 로그인창으로 이동
        new MainWindow().Show();
        this.Close();
        

        AddLog("로그아웃 되었습니다.");
    }

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

    private async void MyDataGrid_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        var dataGrid = sender as DataGrid;
        var point = e.GetCurrentPoint(dataGrid).Position;

        // 클릭한 위치에서 셀을 찾아갑니다.
        var hitTestResult = dataGrid.InputHitTest(point) as Control;
        while (hitTestResult != null && !(hitTestResult is DataGridCell))
        {
            hitTestResult = (Control)hitTestResult.Parent;
        }

        if (hitTestResult is DataGridCell clickedCell && clickedCell.DataContext is DB_data clickedItem) // DB_data는 실제 데이터 타입으로 변경
        {
            // 클릭한 셀의 인덱스를 얻기
            int columnIndex = -1;
            for (int i = 0; i < dataGrid.Columns.Count; i++)
            {
                if (dataGrid.Columns[i].GetCellContent(clickedCell) != null)
                {
                    columnIndex = i;
                    break;
                }
            }

            // 이미지 열인지 확인
            if (columnIndex == 2) // 이미지 열이 세 번째 열(인덱스 2)이라고 가정합니다.
            {
                // 이미지 첨부 다이얼로그 열기
                var fileDialog = new OpenFileDialog
                {
                    Title = "이미지 선택",
                    AllowMultiple = false,
                    Filters = new List<FileDialogFilter>
                {
                    new FileDialogFilter { Name = "Image Files", Extensions = { "png", "jpg", "jpeg", "bmp" } }
                }
                };

                var result = await fileDialog.ShowAsync(this);

                if (result != null && result.Length > 0)
                {
                    // 선택한 파일 경로를 이미지 속성에 설정
                    var imagePath = result[0];
                    var imageProperty = clickedItem.GetType().GetProperty("이미지");
                    if (imageProperty != null)
                    {
                        imageProperty.SetValue(clickedItem, imagePath);
                    }
                }
            }
        }
    }



    // 로그 추가 메서드
    public void AddLog(string message)
    {
        // UI 스레드에서 실행
        Dispatcher.UIThread.InvokeAsync(() =>
        {
            this.LogTextBox.IsEnabled = true;
            this.LogTextBox.Text += DateTime.Now + " " + message + "\n";
            this.LogTextBox.CaretIndex = LogTextBox.Text.Length;  // 스크롤을 맨 아래로 이동
            this.LogTextBox.IsEnabled = false;
        });
    }

    public async void GetDialogsThread(object sender, RoutedEventArgs e)
    {
        Data_.Clear();
        await Task.WhenAll(GetDialogs());
    }

    public async Task GetDialogs()
    {

        /* ★배포시 주석 제거★ */
        //apiId = API_ID.Text;
        //apiHash = API_HASH.Text;
        phoneNumber = PHONE_NUMBER.Text;

        // API 설정값 제공하는 콜백
        string ConfigNeeded(string what)
        {
            switch (what)
            {
                case "api_id": return apiId;
                case "api_hash": return apiHash;
                case "phone_number": return phoneNumber;

                case "verification_code":
                    AddLog("로그인 코드를 입력해주세요.");

                    while (true) // 로그인 코드가 필요할 때 UI에서 입력받도록 수정
                    {
                        if (login_flag == true)
                        {
                            // LOGIN_CODE.Text를 안전하게 UI 스레드에서 가져옵니다.
                            AddLog("로그인 코드가 입력되었습니다.");
                            // LOGIN_CODE.Text를 안전하게 UI 스레드에서 가져옵니다.
                            string verificationCode = Dispatcher.UIThread.InvokeAsync(() => LOGIN_CODE.Text).Result;
                            return verificationCode;
                        }
                    }
                    break;

                case "first_name": return "John";      // if sign-up is required
                case "last_name": return "Doe";        // if sign-up is required
                case "password": return "secret!";     // if user has enabled 2FA
                default: return null;                  // let WTelegramClient decide the default config
            }
        }

        client = new WTelegram.Client(ConfigNeeded);
        await this.client.ConnectAsync();

        AddLog("텔레그램 접속완료. 로그인 인증을 수행합니다. 코드를 입력해주세요.");

        LOGIN_CODE.IsEnabled = true;
        LOGIN_BTN.IsEnabled = true;
        LOGIN_CODE.Focus();

        // 로그인 절차 시작
        var me = await client.LoginUserIfNeeded();

        AddLog("로그인 성공. 대화 목록을 가져옵니다.");

        // 로그인 확인
        if (me == null) // 로그인 실패 처리
        {
            AddLog("로그인 실패. 다시 시도해주세요.");
            return;
        }

        AddLog($"We are logged in as {me.username ?? me.first_name + " " + me.last_name}");
        
        // 대화 목록 가져오기
        dialogs = await client.Messages_GetAllDialogs();

        foreach (Dialog dialog in dialogs.dialogs)
        {
            switch (dialogs.UserOrChat(dialog))
            {
                case TL.User user when user.IsActive:
                    string userName = string.IsNullOrWhiteSpace(user.username)? $"{user.first_name} {user.last_name}".Trim() : user.username;

                    if (userName.Equals(""))
                    {
                        continue;
                    }

                    // 데이터 그리드에 추가
                    var newData = new DB_data(user.id, userName, "", "", "10");
                    Data_.Add(newData);
                    break;

                case ChatBase chat when chat.IsActive: 
                    var newData2 = new DB_data(chat.ID, chat.Title, "", "", "10"); 
                    Data_.Add(newData2);
                    break;
            }
        }

        // 작업 시작버튼으로 변경
        START_BUTTON.Content = "작업 시작";
        START_BUTTON.Click -= GetDialogsThread;
        START_BUTTON.Click += SendMessageThread;
        STOP_BUTTON.IsEnabled = true;

        /*// 대화 목록 가져오기
        dialogs = await client.Messages_GetAllDialogs();
        *//*var dialogs = await client.Messages_GetAllChats();*//*
        foreach (var chat in dialogs.chats.Values)
        {
            if (chat is TL.Channel channel)
            {
                AddLog($"채널: {channel.title}");

                // 데이터 그리드에 추가
                var newData = new DB_data(channel.id ,channel.title, "", "", "10");
                Data_.Add(newData);
            } 
            else if (chat is TL.Chat group)
            {
                AddLog($"그룹: {group.title}");

                // 데이터 그리드에 추가
                var newData = new DB_data(group.id, group.title, "", "", "10");
                Data_.Add(newData);
            }
        }

        // 1:1 대화방 출력 (users를 통해 1:1 대화 확인)
        foreach (var user in dialogs.users.Values)
        {
            // Check if the user has a first or last name, typically indicating a person
            string userName = string.IsNullOrWhiteSpace(user.username)
                ? $"{user.first_name} {user.last_name}".Trim()
                : user.username;

            if (userName.Equals(""))
            {
                continue;
            }

            // 데이터 그리드에 추가
            var newData = new DB_data(user.id, userName, "", "", "10");
            Data_.Add(newData);
            AddLog($"개인 채팅: {userName}");
        }*/
    }
    public async void SendMessageThread(object sender, RoutedEventArgs e)
    {
        // grid item 읽어와서 메세지 리스트 만들기
        var messageList = new List<DB_data>();
        foreach (var item in Data_)
        {
            messageList.Add(item);
        }

        await Task.WhenAll(SendMessagesAsync(messageList));
    }

    // 메시지와 이미지 경로 및 전송 간격에 따른 전송 작업
    public async Task SendMessagesAsync(List<DB_data> messages)
    {
        var sendTasks = new List<Task>();

        foreach (var messageData in messages)
        {
            // 메시지 내용과 이미지가 모두 비어 있으면 건너뜀
            if (string.IsNullOrWhiteSpace(messageData.메세지) && string.IsNullOrWhiteSpace(messageData.이미지))
            {
                continue;
            }

            // 비동기 메시지 전송 작업 추가 (Task)
            sendTasks.Add(SendMessage(messageData, dialogs));
        }

        // 모든 작업을 병렬로 처리
        await Task.WhenAll(sendTasks);
    }

    private async Task SendMessage(DB_data messageData, Messages_Dialogs dialogs)
    {
        long chatId = messageData.chatId;
        int interval = int.Parse(messageData.간격);
        string imagePath = messageData.이미지;
        string message = messageData.메세지;
        int repeat;

        workFlag = true;

        if (this.Repeat.SelectedItem == null)
        {

            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "반복 횟수를 설정해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        var comboBox = this.Find<ComboBox>("Repeat");
        var content = "";

        // 선택된 아이템 확인
        if (comboBox.SelectedItem is ComboBoxItem selectedItem)
        {
            content = selectedItem.Content.ToString();
            Console.WriteLine($"선택된 아이템: {content}");
        }

        if (content == "무한반복")
        {
            repeat = 999999999;
        }
        else
        {
            string repeatTime = this.RepeatTime.Text;

            bool isSuccess = int.TryParse(repeatTime, out repeat);

            if (!isSuccess)
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "반복 횟수에는 숫자만 입력해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                return;
            }

            repeat = int.Parse(RepeatTime.Text);
        }

        while (!workFlag)
        {
            AddLog("작업이 중지되었습니다.");
            return;
        }

        for (int i = 0; i < repeat; i++)
        {

            while (!workFlag)
            {
                AddLog("작업이 중지되었습니다.");
                return;
            }

            // chatId를 InputPeer로 변환 (채팅방/사용자 정보를 가져와서 사용)
            var chat = dialogs.chats.Values.FirstOrDefault(c => c.ID == chatId);

            InputPeer peer = null;

            if (chat is TL.Chat tlChat)
            {
                peer = new InputPeerChat(tlChat.ID);
            }
            else if (chat is TL.Channel tlChannel)
            {
                peer = new InputPeerChannel(tlChannel.ID, tlChannel.access_hash); // AccessHash도 필요
            }
            else
            {
                // 사용자 정보는 dialogs.users에서 찾아야 함
                var user = dialogs.users.Values.FirstOrDefault(u => u.ID == chatId);

                if (user != null)
                {
                    peer = new InputPeerUser(user.ID, user.access_hash);
                }
            }

            while (!workFlag)
            {
                AddLog("작업이 중지되었습니다.");
                return;
            }

            if (peer == null)
            {
                AddLog($"해당 ID로 채팅방이나 사용자를 찾을 수 없습니다: {chatId}");
                return;
            }

            while (!workFlag)
            {
                AddLog("작업이 중지되었습니다.");
                return;
            }

            // 이미지가 있으면 이미지 포함하여 전송
            if (!string.IsNullOrWhiteSpace(imagePath) && System.IO.File.Exists(imagePath))
            {
                var inputFile = await client.UploadFileAsync(imagePath);  // 업로드 파일 생성
                var mediaPhoto = new InputMediaUploadedPhoto { file = inputFile };  // InputMedia 객체 생성

                await client.SendMessageAsync(peer : peer, text:message ?? "", mediaPhoto);  // 메시지와 이미지 전송
            }
            else
            {
                // 이미지가 없을 경우 메시지 내용만 전송
                await client.SendMessageAsync(peer:peer,text:message?? "");  // 메시지 전송
            }

            AddLog($"{i}회 메세지 전송에 성공하였습니다. {chatId}: {message}\n{interval}초 대기합니다.");

            while (!workFlag)
            {
                AddLog("작업이 중지되었습니다.");
                return;
            }

            // 간격 적용 (간격이 설정되어 있다면)
            if (interval > 0)
            {
                await Task.Delay(interval * 1000); // 간격을 초 단위로 변환
            }

            while (!workFlag)
            {
                AddLog("작업이 중지되었습니다.");
                return;
            }
        }
    }

    // 직접 입력 콤보박스 선택시 입력 창 활성화
    public async void SetRepeatType(object sender, SelectionChangedEventArgs e)
    {
        var comboBox = sender as ComboBox;

        if (comboBox?.SelectedItem is ComboBoxItem selectedItem)
        {
            var selectedContent = selectedItem.Content?.ToString(); // 선택된 아이템의 Content
            
            if (selectedContent == "직접입력")
            {
                RepeatTime.IsEnabled = true;
                RepeatTime.Focus();
            }
            else
            {
                RepeatTime.IsEnabled = false;
                RepeatTime.Text = "";
            }
        }
    }

    private void LOGIN_CODE_TextChanged(object sender, RoutedEventArgs e)
    {
        // 텍스트 박스에서 5자리 코드 입력 확인
        if (LOGIN_CODE.Text != null)
        {
            login_flag = true; // 코드 길이가 5이면 로그인 플래그를 true로 설정
        }
        else
        {
            login_flag = false; // 그렇지 않으면 false로 설정
        }
    }

    // 이미지 선택 시 해당 셀에 이미지 경로 설정
    private async void OnSelectImageClick(object? sender, RoutedEventArgs e)
    {
        /*var rowIndex = MyDataGrid.SelectedIndex;*/
        int rowIndex = -1;

        // 1. 버튼(sender)의 DataContext를 가져와 현재 행의 데이터를 확인
        if (sender is Button button)
        {
            // 현재 행(Row)의 데이터 모델
            var rowData = button.DataContext as DB_data;

            // 2. DataGrid의 ItemsSource에서 현재 행(Row)의 인덱스 찾기
            foreach (var item in Data_)
            {
                if (item.chatId == rowData.chatId)
                {
                    rowIndex = Data_.IndexOf(item);
                    break;
                }
            }
        }

        if (rowIndex == -1)
        {
            var messagebox = MessageBoxManager.GetMessageBoxStandard("오류", "행 정보를 불러오는 중에 오류가 발생했습니다.", ButtonEnum.Ok);
            messagebox.ShowWindowDialogAsync(this);

            return;
        }

        // 파일 열기 다이얼로그 설정
        var openFileDialog = new OpenFileDialog
        {
            Title = "이미지 선택",
            AllowMultiple = false,
            Filters = new List<FileDialogFilter>
            {
                new FileDialogFilter { Name = "Images", Extensions = { "png", "jpg", "jpeg", "bmp" } }
            }
        };

        var result = await openFileDialog.ShowAsync(this);
        if (result != null && result.Length > 0)
        {
            var selectedFilePath = result[0];

            // DataGrid 항목 업데이트
            Data_[rowIndex].이미지 = selectedFilePath;

            // 필요한 경우 DataGrid 새로고침
            MyDataGrid.ItemsSource = null;
            MyDataGrid.ItemsSource = Data_;
        }
    }

    public async void StopSending(object sender, RoutedEventArgs e)
    {
        // 작업 중지
        this.workFlag = false;
    }

    // 설정 저장
    public async void SaveSettings(object sender, RoutedEventArgs e)
    {
        try
        {
            var apiId = this.API_ID.Text;
            var apiHash = this.API_HASH.Text;
            var phoneNumber = this.PHONE_NUMBER.Text;

            if (apiId == "" || apiHash == "" || phoneNumber == "")
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "API 정보를 입력해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                return;
            }

            // 반복횟수, 무한반복 여부, 반복 간격을 설정합니다.
            var repeat = this.Repeat.SelectedItem;
            var repeatTime = this.RepeatTime.Text;

            // 반복 횟수가 직접 입력일 경우
            if (repeat.ToString() == "직접입력")
            {
                if (string.IsNullOrWhiteSpace(repeatTime))
                {
                    var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "반복 횟수를 입력해주세요.", ButtonEnum.Ok);
                    await messageBox.ShowWindowDialogAsync(this);
                    return;
                }
                else if(int.TryParse(repeatTime, out int result) == false || int.Parse(repeatTime) < 1)
                {
                    var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "반복 횟수에는 1이상의 숫자만 입력해주세요.", ButtonEnum.Ok);
                    await messageBox.ShowWindowDialogAsync(this);
                    return;
                }
            }
            else
            {
                repeatTime = "";
            }
            var repeatSetting = new Dictionary<string, string>
            {
                { "Repeat", repeat.ToString() },
                { "RepeatTime", repeatTime },
                { "apiId", apiId },
                { "apiHash", apiHash },
                { "phoneNumber", phoneNumber }
            };

            // 설정을 JSON으로 직렬화
            var data = JsonConvert.SerializeObject(repeatSetting);
            await System.IO.File.WriteAllTextAsync("repeatSettings.json", data);

            //data = JsonConvert.SerializeObject(this.Data_);
            //await System.IO.File.WriteAllTextAsync("settings.json", data);

            AddLog("설정이 정상적으로 저장되었습니다.");
        }
        catch (Exception ex)
        {
            AddLog($"설정 저장 중 오류가 발생했습니다: {ex.Message}");
            return;
        }
    }

    // 설정 로드
    public async void LoadSettings()
    {
        try
        {
            var data1 = await System.IO.File.ReadAllTextAsync("repeatSettings.json");
            var settings1 = JsonConvert.DeserializeObject<Dictionary<string, string>>(data1);
            if (settings1 != null)
            {
                /*this.Repeat.SelectedItem = settings1["Repeat"];*/
                var repeatComboBox = this.Find<ComboBox>("Repeat");
                foreach (var item in repeatComboBox.Items)
                {
                    if (item.ToString() == settings1["Repeat"])
                    {
                        repeatComboBox.SelectedItem = item;
                        break;
                    }
                }
                this.RepeatTime.Text = settings1["RepeatTime"];
                this.API_ID.Text = settings1["apiId"];
                this.API_HASH.Text = settings1["apiHash"];
                this.PHONE_NUMBER.Text = settings1["phoneNumber"];
            }

            //var data2 = await System.IO.File.ReadAllTextAsync("settings.json");
            //var settings2 = JsonConvert.DeserializeObject<ObservableCollection<DB_data>>(data2);
            //if (settings2 != null)
            //{
            //    this.Data_ = settings2;
            //    this.MyDataGrid.ItemsSource = null;
            //    this.MyDataGrid.ItemsSource = this.Data_;
            //}

            AddLog("설정을 정상적으로 로드하였습니다.");
        }
        catch (Exception ex)
        {
            AddLog($"설정 불러오기 중 오류가 발생했습니다: {ex.Message}");
            return;
        }
    }
}