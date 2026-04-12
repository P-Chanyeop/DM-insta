using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Markup.Xaml;
using Avalonia.Threading;
using MsBox.Avalonia.Enums;
using MsBox.Avalonia;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Threading.Tasks;
using System;
using System.Linq;
using OfficeOpenXml;
using System.IO;
using System.Net.Http;
using ExCSS;
using HtmlAgilityPack;
using System.Text;
using System.Text.Json;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using System.Net;
using Newtonsoft.Json.Linq;
using OpenQA.Selenium.Interactions;
using System.Runtime.InteropServices;
using Newtonsoft.Json;
using System.Threading;

namespace NaverWriting;

public partial class NaverWritingWindow : Window
{
    public ObservableCollection<UserData> Users { get; set; }
    public ObservableCollection<ArticleData> Articles { get; set; }
    public ObservableCollection<TaskData> Tasks_ { get; set; }

    private readonly Dictionary<string, string> _cafeList = new Dictionary<string, string>(); // 카페목록 저장 변수

    // 카페 목록
    Dictionary<string, List<string>> boardList;

    // 게시판 목록
    Dictionary<string, string> boards;

    HttpClientHandler handler;
    HttpClient client;

    OptionTask NaverOptions = new OptionTask();

    // Import Windows API functions
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindowEx(IntPtr hWndParent, IntPtr hWndChildAfter, string lpszClass, string lpszWindow);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    // Constants
    const uint BM_CLICK = 0x00F5;

    // pictures 리스트
    List<string> picturePaths = new List<string>();

    // 유저 데이터 클래스
    public class UserData
    {
        public string Id { get; set; }
        public string Password { get; set; }
        public string Status { get; set; }

        public UserData(string id, string password, string status)
        {
            this.Id = id;
            this.Password = password;
            this.Status = status;
        }
    }

    public class ArticleData
    {
        public string ArticleTitle { get; set; }
        public string ArticleMemo { get; set; }
        public string ArticleRepPicturePath { get; set; }
        public string ArticleContent { get; set; }

        public bool IsArticleSafePayment { get; set; }
        public string ArticleTags { get; set; }
        public string ArticlePrice { get; set; }
        public bool IsArticlePublic { get; set; }
        public bool IsArticleCanSearch { get; set; }
        public string ArticleSeller { get; set; }
        public string ArticleSellerPhone { get; set; }
        public string ArticleSellerEmail { get; set; }
        public bool IsArticleCanScrap { get; set; }
        public bool IsArticleCanCopy { get; set; }
        public bool IsArticleCanCCL { get; set; }
    }

    public ObservableCollection<DB_data> Data_ { get; }

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

    public ObservableCollection<UploadTask> Task_ { get; }

    public class UploadTask
    {
        public string UploadCafeName { get; set; }
        public string UploadBoardName { get; set; }
        public string UploadID { get; set; }
        public string UploadArticle { get; set; }
        public string UploadStatus { get; set; }
    }

    public class OptionTask
    {
        public bool IsPrivatePhoneNumber { get; set; }
        public bool IsForeverLoop { get; set; }
        public bool IsAutoDelete { get; set; }
        public string RepImagePosition { get; set; }
        public int LoopTimes { get; set; }
        public int Interval { get; set; }
        public string Category1 { get; set; }
        public string Category2 { get; set; }
        public string Category3 { get; set; }
        public string ProductStatus { get; set; }
        public string ProductDelivery { get; set; }
        public string ProductSafePayment { get; set; }
        public bool DisplayPhoneNumber { get; set; }
    }


    public NaverWritingWindow()
    {

    }

    public NaverWritingWindow(string apikey, string responseText)
    {
        this.InitializeComponent();

        var jsonDoc = JsonDocument.Parse(responseText);
        //string nickname = jsonDoc.RootElement.GetProperty("name").GetString();
        //int remainDays = jsonDoc.RootElement.GetProperty("remainingDays").GetInt32();
        string nickname = "소프트캣";
        int remainDays = 30;

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

        Users = new ObservableCollection<UserData>();
        Articles = new ObservableCollection<ArticleData>();
        Tasks_ = new ObservableCollection<TaskData>();

        // DataGrid에 바인딩
        /*MyDataGrid.DataContext = this;*/
        MyDataGrid.ItemsSource = Users;
        MyDataGrid2.ItemsSource = Articles;
        MyDataGrid3.ItemsSource = Tasks_;

        // ItemsSource는 자동으로 바인딩됩니다 (XAML에서 설정된 바인딩에 따라).
        this.CanResize = false;

        // 엑셀 저장을 위한 EPPlus 라이브러리 초기화
        ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;

        // 예약시간을 현재시간으로 설정
        this.RESERVE_HOUR.Text = DateTime.Now.Hour.ToString();
        this.RESERVE_MINUTE.Text = DateTime.Now.Minute.ToString();

        // 옵션 초기화
        NaverOptions = new OptionTask();
        NaverOptions.IsPrivatePhoneNumber = false;
        NaverOptions.DisplayPhoneNumber = false;
        NaverOptions.IsForeverLoop = false;
        NaverOptions.IsAutoDelete = false;
        NaverOptions.RepImagePosition = "상단";
        NaverOptions.LoopTimes = 1;
        NaverOptions.Interval = 30;
        NaverOptions.DisplayPhoneNumber = false;
        NaverOptions.ProductStatus = "";
        NaverOptions.ProductDelivery = "";
        NaverOptions.ProductSafePayment = "";

        // users.json, articles.json, options.json 설정 불러오기
        // 데이터 초기화
        LoadData();
    }

    private void LoadData()
    {
        try
        {
            // 유저 정보 불러오기
            if (File.Exists("users.json"))
            {
                var usersJson = File.ReadAllText("users.json");
                Users = JsonConvert.DeserializeObject<ObservableCollection<UserData>>(usersJson) ?? new ObservableCollection<UserData>();
                MyDataGrid.ItemsSource = Users;

                // 아이디 콤보박스에 추가
                foreach(var item in Users)
                {
                    SELECT_ID.Items.Add(item.Id);
                }
            }
            else
            {
                Users = new ObservableCollection<UserData>();
                MyDataGrid.ItemsSource = Users;
            }

            // 게시글 정보 불러오기
            if (File.Exists("articles.json"))
            {
                var articlesJson = File.ReadAllText("articles.json");
                Articles = JsonConvert.DeserializeObject<ObservableCollection<ArticleData>>(articlesJson) ?? new ObservableCollection<ArticleData>();
                MyDataGrid2.ItemsSource = Articles;

                // 게시글 콤보박스에 추가
                foreach (var item in Articles)
                {
                    SELECT_ARTICLE.Items.Add(item.ArticleTitle);
                }
            }
            else
            {
                Articles = new ObservableCollection<ArticleData>();
                MyDataGrid2.ItemsSource = Articles;
            }

            // 옵션 정보 불러오기
            if (File.Exists("options.json"))
            {
                var optionsJson = File.ReadAllText("options.json");
                NaverOptions = JsonConvert.DeserializeObject<OptionTask>(optionsJson) ?? new OptionTask();
                this.NaverOptions = NaverOptions;
            }
            else
            {

            }

            AddLog("세팅 정보를 정상적으로 로드했습니다.");
        }
        catch (Exception ex)
        {
            AddLog("세팅 정보를 로드하는 중 에러가 발생했습니다.");
        }
    }

    // API 키 입력란에 포커스를 얻거나 잃었을 때의 동작을 정의.
    private void TextBox_GotFocus(object? sender, GotFocusEventArgs e)
    {
        if (sender is TextBox textBox)
        {
            // 포커스를 얻었을 때의 동작
            textBox.Background = Avalonia.Media.Brush.Parse("#FFFFFF");
            textBox.Foreground = Avalonia.Media.Brush.Parse("#1F2328");
        }
    }

    private void TextBox_LostFocus(object? sender, RoutedEventArgs e)
    {
        if (sender is TextBox textBox)
        {
            // 포커스를 잃었을 때의 동작
            textBox.Background = Avalonia.Media.Brush.Parse("#1F2328");
            textBox.Foreground = Avalonia.Media.Brush.Parse("#FFFFFF");
        }
    }

    // 마이페이지 이동
    private void Manage_MyPage(object sender, RoutedEventArgs e)
    {
        // 마이페이지 페이지로 이동
        Process.Start(new ProcessStartInfo
        {
            FileName = "https://softcat.co.kr/mypage",
            UseShellExecute = true
        });
    }

    // 문의하기 이동
    private void Manage_QnA(object sender, RoutedEventArgs e)
    {
        // 구독 관리 페이지로 이동
        Process.Start(new ProcessStartInfo
        {
            FileName = "https://softcat.co.kr/apply/entry",
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

    // 게시글 등록 팝업창 오픈
    public void AddNewArticle(object sender, RoutedEventArgs e)
    {
        var addArticleWindow = new WritingToobar(this);
        addArticleWindow.Show();
    }

    // 아이디 / 비밀번호 입력 데이터로 로그인 데이터 추가 
    public async void AddLoginData(object sender, RoutedEventArgs e)
    {
        // 아이디 비밀번호 입력 데이터 추출
        string id = this.ID_INPUT.Text;
        string password = this.PW_INPUT.Text;

        if (id == "" || password == "")
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "아이디 및 비밀번호를 입력해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // 로그인 데이터 Datagrid에 추가
        Users.Add(new UserData(id, password, "대기"));

        // ID 선택 콤보박스에 추가
        this.SELECT_ID.Items.Add(id);

        // 입력창 초기화
        this.ID_INPUT.Text = "";
        this.PW_INPUT.Text = "";
    }

    // 아이디 / 비밀번호 입력 엑셀 데이터 추가
    private async void LoadLoginExcelThread(object sender, RoutedEventArgs e)
    {
        await Task.WhenAll(LoadIDExcelFileAsync());
    }

    public async Task LoadIDExcelFileAsync()
    {
        // 파일 다이얼로그 생성 및 설정
        OpenFileDialog openFileDialog = new OpenFileDialog
        {
            Title = "아이디 Excel 파일 선택",
            AllowMultiple = false,
            Filters = new List<FileDialogFilter>
            {
                new FileDialogFilter { Name = "Excel Files", Extensions = new List<string> { "xlsx", "xls" } },
                new FileDialogFilter { Name = "All Files", Extensions = new List<string> { "*" } }
            }
        };

        // 파일 선택 다이얼로그 표시
        string[]? result = await openFileDialog.ShowAsync(this);
        if (result != null && result.Length > 0)
        {
            string filePath = result[0];  // 선택한 파일 경로

            try
            {
                // Excel 파일 열기
                using (ExcelPackage package = new ExcelPackage(new FileInfo(filePath)))
                {
                    ExcelWorksheet worksheet = package.Workbook.Worksheets.First();  // 첫 번째 워크시트 가져오기
                    int rowCount = worksheet.Dimension.Rows;  // 행 개수 가져오기
                    int colCount = worksheet.Dimension.Columns;  // 열 개수 가져오기

                    // 데이터를 읽어서 DataItem 리스트에 추가
                    for (int row = 2; row <= rowCount; row++)
                    {
                        // 엑셀 데이터 읽기
                        UserData user = new UserData(worksheet.Cells[row, 1].Text, worksheet.Cells[row, 2].Text, "대기");

                        // DataGrid에 표시할 데이터에 추가
                        this.Users.Add(user);

                        // ID 선택 콤보박스에 추가
                        this.SELECT_ID.Items.Add(user.Id);
                    }
                }

                // 성공 메시지 출력
                AddLog("엑셀 데이터가 성공적으로 추가되었습니다.");
            }
            catch (Exception ex)
            {
                Console.WriteLine("엑셀 파일을 읽는 동안 오류가 발생했습니다: " + ex.Message);
                AddLog("엑셀 파일을 읽는 동안 오류가 발생했습니다.");
            }
        }
        else
        {
            AddLog("파일 선택이 취소되었습니다.");
        }
    }

    // 게시글 등록 데이터 추가
    public async void AddArticleData(ArticleData data)
    {
        Articles.Add(data);

        // combobox 에 아이템 추가
        this.SELECT_ARTICLE.Items.Add(data.ArticleTitle);

        MyDataGrid2.ItemsSource = null;
        MyDataGrid2.ItemsSource = Articles;
    }

    public async void SetArticlePictures(List<string> picturePaths)
    {
        this.picturePaths = picturePaths;
    }


    // 게시글 엑셀 데이터 추가
    private async void LoadArticleExcelThread(object sender, RoutedEventArgs e)
    {
        await Task.WhenAll(LoadArticleExcelFileAsync());
    }

    public async Task LoadArticleExcelFileAsync()
    {
        // 파일 다이얼로그 생성 및 설정
        OpenFileDialog openFileDialog = new OpenFileDialog
        {
            Title = "게시글 Excel 파일 선택",
            AllowMultiple = false,
            Filters = new List<FileDialogFilter>
            {
                new FileDialogFilter { Name = "Excel Files", Extensions = new List<string> { "xlsx", "xls" } },
                new FileDialogFilter { Name = "All Files", Extensions = new List<string> { "*" } }
            }
        };

        // 파일 선택 다이얼로그 표시
        string[]? result = await openFileDialog.ShowAsync(this);
        if (result != null && result.Length > 0)
        {
            string filePath = result[0];  // 선택한 파일 경로

            try
            {
                // Excel 파일 열기
                using (ExcelPackage package = new ExcelPackage(new FileInfo(filePath)))
                {
                    ExcelWorksheet worksheet = package.Workbook.Worksheets.First();  // 첫 번째 워크시트 가져오기
                    int rowCount = worksheet.Dimension.Rows;  // 행 개수 가져오기
                    int colCount = worksheet.Dimension.Columns;  // 열 개수 가져오기

                    // 데이터를 읽어서 DataItem 리스트에 추가
                    for (int row = 2; row <= rowCount; row++)
                    {
                        // 엑셀 데이터 읽기. 제목 / 텍스트만
                        string title = worksheet.Cells[row, 1].Text;
                        string content = worksheet.Cells[row, 2].Text;
                        string memo = worksheet.Cells[row, 3].Text;

                        Articles.Add(new ArticleData
                        {
                            ArticleTitle = title,
                            ArticleContent = content,
                            ArticleMemo = memo
                        });

                        // 게시글 콤보박스 추가
                        this.SELECT_ARTICLE.Items.Add(title);
                    }
                }

                MyDataGrid2.ItemsSource = null;
                MyDataGrid2.ItemsSource = Articles;

                // 성공 메시지 출력
                AddLog("엑셀 데이터가 성공적으로 추가되었습니다.");
            }
            catch (Exception ex)
            {
                Console.WriteLine("엑셀 파일을 읽는 동안 오류가 발생했습니다: " + ex.Message);
                AddLog("엑셀 파일을 읽는 동안 오류가 발생했습니다.");
            }
        }
        else
        {
            AddLog("파일 선택이 취소되었습니다.");
        }
    }

    // Datagrid에서 선택한 아이디 데이터 삭제
    public async void DeleteSelectedUserData(object sender, RoutedEventArgs e)
    {
        // 선택된 데이터 삭제 -> foreach문에서 Remove를 사용하면 Users collection이 변경되어 오류가 발생함. 기존에 collection이 변경되지 않도록 복사하여 삭제하는 방법을 사용해야 함.
        /*foreach (var item in selected_Items)
        {
            if (item is UserData selectedData)
            {
                Users.Remove(selectedData);
            }
        }*/

        System.Collections.IList selectedItems = MyDataGrid.SelectedItems;

        // 아무것도 선택되지 않았을 때
        if (selectedItems.Count == 0)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "삭제할 데이터를 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // 선택된 데이터를 임시 리스트에 저장
        var itemsToDelete = selectedItems.Cast<UserData>().ToList();

        // 선택된 데이터 삭제
        foreach (var item in itemsToDelete)
        {
            Users.Remove(item);
            SELECT_ID.Items.Remove(item.Id);
        }
    }

    // 모든 Datagrid 아이디 데이터 삭제
    public async void DeleteAllUserData(object sender, RoutedEventArgs e)
    {
        // 모든 데이터 삭제
        Users.Clear();
        SELECT_ID.Items.Clear();
    }

    // 게시글 데이터 선택삭제
    public async void DeleteSelectedArticleData(object sender, RoutedEventArgs e)
    {
        System.Collections.IList selectedItems = MyDataGrid2.SelectedItems;

        // 아무것도 선택되지 않았을 때
        if (selectedItems.Count == 0)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "삭제할 데이터를 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // 선택된 데이터를 임시 리스트에 저장
        var itemsToDelete = selectedItems.Cast<ArticleData>().ToList();

        // 선택된 데이터 삭제
        foreach (var item in itemsToDelete)
        {
            Articles.Remove(item);
            SELECT_ARTICLE.Items.Remove(item.ArticleTitle);
        }
    }

    // 게시글 데이터 전체삭제
    public async void DeleteAllArticleData(object sender, RoutedEventArgs e)
    {
        // 모든 데이터 삭제
        Articles.Clear();
        SELECT_ARTICLE.Items.Clear();
    }

    // 게시글 콤보박스 추가 함수
    public async Task Select_Cafe_SelectionChanged()
    {
        SELECT_CAFE.Items.Clear();
        SELECT_BOARD.Items.Clear();
        SELECT_HEAD_TEXT.Items.Clear();
        
        int idx = 0;
        // 가입된 게시글 목록을 가져옴
        boardList = new Dictionary<string, List<string>>();

        // 네이버 카페 목록 가져오기 
        /*string cafeListUrl = "https://section.cafe.naver.com/ca-fe/home/manage-my-cafe/join";
        var response = await httpClient.GetAsync(cafeListUrl);
        var htmlContent = await response.Content.ReadAsStringAsync();*/

        int currentPage = 1;
        bool isLastPage = false;
        var url = "https://apis.naver.com/cafe-home-web/cafe-home/v1/config/join-cafes/groups/";

        // HTTP 요청
        while (idx < 5)
        {

            client = new HttpClient(handler);
            
            // 카페 목록을 저장할 리스트
            while (!isLastPage)
            {
                // 페이지 URL 만들기
                string pageUrl = $"{url}?page={currentPage}&perPage=5&type=join&recentUpdates=true";

                try
                {

                    var response = await client.GetAsync(pageUrl);
                    response.EnsureSuccessStatusCode();

                    // JSON 응답 받기
                    var jsonResponse = await response.Content.ReadAsStringAsync();

                    // JSON 파싱
                    var jsonData = JObject.Parse(jsonResponse);
                    var result = jsonData["message"]["result"];
                    var cafes = result["groups"][0]["cafes"];

                    // 카페 이름과 URL 저장
                    foreach (var cafe in cafes)
                    {
                        string cafeName = cafe["cafeName"].ToString();
                        string cafeUrl = cafe["cafeUrl"].ToString();
                        string cafeID = cafe["cafeId"].ToString();
                        var list = new List<string> { cafeUrl, cafeID };

                        boardList.Add(cafeName, list);
                    }

                    // 다음 페이지 여부 확인
                    var pageInfo = result["pageInfo"];
                    int totalCount = (int)pageInfo["totalCount"];
                    int perPage = (int)pageInfo["perPage"];
                    isLastPage = pageInfo["lastPage"].ToObject<bool>();

                    // 다음 페이지로 넘어가기 위해 currentPage 증가
                    if (!isLastPage)
                    {
                        currentPage++;
                        continue;
                    }

                    await Task.Delay(100);

                    break;

                }
                catch (Exception ex)
                {
                    AddLog(ex.Message);
                    AddLog("카페 목록을 불러오는 도중 오류가 발생했습니다. 해당 문제가 계속된다면 개발자에게 문의해주세요.");
                    idx += 1;
                }
            }

            // 카페 목록 콤보박스 초기화
            SELECT_CAFE.Items.Clear();

            // 카페 목록 콤보박스에 추가
            foreach (var cafe in boardList)
            {
                SELECT_CAFE.Items.Add(cafe.Key);
            }

            AddLog("카페 목록 불러오기 성공.");
            break;
            
        }
    }
    /*private async void Select_Cafe_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        var cafeName = "";

        // 선택된 항목이 "추가"일 경우
        if (SELECT_CAFE.SelectedItem is ComboBoxItem selectedItem && selectedItem.Content?.ToString() == "추가")
        {
            // 새로운 항목 생성 및 추가
            var address = await GetAddressInputAsync();     // 주소 입력 받기
            var errorCount = 0;
            if (address != null)
            {
                while (true)
                {
                    // 콤보박스에는 카페명 추가
                    try
                    {
                        // EUC-KR 인코딩 제공자 등록
                        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

                        using var httpClient = new HttpClient();

                        // HTML 응답을 바이트 배열로 받고, EUC-KR로 디코딩
                        byte[] responseBytes = await httpClient.GetByteArrayAsync(address);
                        string htmlContent = Encoding.GetEncoding("euc-kr").GetString(responseBytes);

                        Task.Delay(1000).Wait();

                        // HtmlDocument 로드
                        var htmlDoc = new HtmlDocument();
                        htmlDoc.LoadHtml(htmlContent);

                        Task.Delay(1000).Wait();

                        // title 태그 검색
                        var titleNode = htmlDoc.DocumentNode.SelectSingleNode("//head/title");
                        cafeName = titleNode != null ? titleNode.InnerText : "제목을 찾을 수 없습니다.";

                        if (cafeName != "제목을 찾을 수 없습니다.")
                        {
                            foreach(var item in _cafeList)
                            {
                                if (item.Key == cafeName.Trim())
                                {
                                    AddLog("이미 추가된 카페입니다. 다른 카페를 추가해주세요.");
                                    return;
                                }
                            }
                        }

                    }
                    catch (Exception ex)
                    {
                        AddLog("카페명을 가져오는 도중 오류가 발생했습니다. (주소: " + address + $"). 다시 시도합니다. 오류 횟수 : {errorCount}");
                        errorCount++;
                        Task.Delay(500).Wait();

                        if (errorCount > 4)
                        {
                            // 5번 이상 오류 발생 시 중단
                            // 선택 초기화 (다시 "추가"가 선택되도록)
                            SELECT_CAFE.SelectedItem = null;
                            AddLog("카페명을 가져오는 도중 오류가 발생했습니다. (주소: " + address + $"). 오류 횟수 : {errorCount}");
                            return;
                        }
                        continue;
                    }

                    ComboBoxItem newItem = new ComboBoxItem { Content = cafeName.Trim() };
                    SELECT_CAFE.Items.Add(newItem);
                    _cafeList.Add(cafeName.Trim(), address);

                    SELECT_CAFE.SelectedItem = null;
                    AddLog("카페가 정상적으로 추가되었습니다. (주소: " + address + ")");
                    break;
                }
            }
            else
            {
                AddLog("주소 입력이 취소되었습니다."); 
            }
        }
        else
        {
            var boardList = new Dictionary<string, string>();

           // 선택된 항목이 "추가"가 아닐 경우
            cafeName = SELECT_CAFE.SelectionBoxItem?.ToString() ?? "";

            // 선택된 항목의 카페명이 일치하는 아이템의 주소를 가져옴
            foreach (var item in _cafeList)
            {
                if (item.Key == cafeName)
                {
                    // 주소를 가져옴
                    var address = item.Value;

                    // 게시판 목록을 가져옴
                    boardList = await GetBoardListAsync(address);

                    SELECT_BOARD.Items.Clear();

                    if (boardList?.Count > 0 && boardList != null) {
                        for (int i = 0; i < boardList.Count; i++)
                        {
                            ComboBoxItem newBoardItem = new ComboBoxItem { Content = boardList.ElementAt(i).Value };
                            SELECT_BOARD.Items.Add(newBoardItem);
                        }
                        AddLog("게시판이 정상적으로 추가되었습니다");
                    }
                    else
                    {
                        AddLog("게시판을 가져오는 도중 오류가 발생했습니다.");
                    }
                    
                }
            }
        }
    }*/
    public async Task<Dictionary<string, string>?> GetBoardListAsync(string cafeUrl)
    {
        // 게시판 리스트 가져오기
        // EUC-KR 인코딩 제공자 등록
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        int idx = 0;
        while (idx < 5)
        {
            try
            {
                var httpClient = new HttpClient();

                // HTML 응답을 바이트 배열로 받고, EUC-KR로 디코딩
                byte[] responseBytes = await httpClient.GetByteArrayAsync(cafeUrl);
                string htmlContent = Encoding.GetEncoding("euc-kr").GetString(responseBytes);

                // HtmlDocument 로드
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(htmlContent);

                // 게시판 목록 추출
                var boardNodes = htmlDoc.DocumentNode.SelectNodes("//ul[contains(@class, 'cafe-menu-list')]/li/a");
                if (boardNodes == null)
                {
                    return null;
                }

                // 게시판 목록을 문자열로 구성
                var boardList = new Dictionary<string, string>();

                foreach (var boardNode in boardNodes)
                {
                    // 게시판 이름과 ID 추출
                    string boardName = boardNode.InnerText.Trim();
                    string boardId = boardNode.GetAttributeValue("id", "").Replace("menuLink", "");

                    boardList.Add(boardId, boardName);
                }

                return boardList;
            }
            catch (Exception ex)
            {

               AddLog("게시판 목록을 가져오는 도중 오류가 발생했습니다. 다시 시도합니다.");
               idx += 1;
            }
        }
        AddLog("게시판 목록을 가져오는 작업 실패.");
        return null;
    }

    public async Task<string?> GetAddressInputAsync()
    {
        var addressInputDialog = new AddressInputDialog();
        return await addressInputDialog.ShowDialog<string?>(this); // 주소 입력창 표시 및 결과 반환
    }

    private async void ShowAddressInputDialog()
    {
        var address = await GetAddressInputAsync();
        if (address != null)
        {
            // 입력받은 주소 처리
            Console.WriteLine("입력된 주소: " + address);
        }
        else
        {
            // 입력 취소 처리
            Console.WriteLine("주소 입력이 취소되었습니다.");
        }
    }

    // 카페 목록 불러오기
    public async void LoginNaverAndGetCafeList(object sender, RoutedEventArgs e)
    {
        AddLog("로그인 인증을 수행합니다. 잠시 대기해 주세요.");

        // 콤보박스에서 선택한 아이디의 User 정보 가져오기
        var selectedId = SELECT_ID.SelectedItem?.ToString();
        var selectedUser = Users.FirstOrDefault(user => user.Id == selectedId);

        if (selectedUser == null)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "아이디를 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // selectedUser정보로 아이디와 비밀번호 가져오기
        var id = selectedUser.Id;
        var pw = selectedUser.Password;

        var driverService = ChromeDriverService.CreateDefaultService();
        driverService.HideCommandPromptWindow = true;

        var options = new ChromeOptions();
        options.AddArgument("--disable-gpu");

        /*options.AddArgument("--headless");*/

        options.AddArgument("--window-size=500,200");

        options.AddArgument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36");

        var driver = new ChromeDriver(driverService, options);
        driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);

        string login_url = "https://nid.naver.com/nidlogin.login?mode=form&url=https://www.naver.com/";

        driver.Navigate().GoToUrl(login_url);

        // 클립보드로 ID 복사
        var clipboard = this.Clipboard;
        string content = clipboard.GetTextAsync().Result;
        await clipboard.SetTextAsync(id);

        var idField = driver.FindElement(By.Id("id"));
        idField.Click(); // 필드 포커싱 (필요한 경우)
        await Task.Delay(100);
        var actions = new OpenQA.Selenium.Interactions.Actions(driver);
        actions.KeyDown(Keys.Control).SendKeys("v").KeyUp(Keys.Control).Perform();

        // 클립보드로 PW 복사
        await clipboard.SetTextAsync(pw);
        var pwField = driver.FindElement(By.Id("pw"));
        pwField.Click(); // 필드 포커싱 (필요한 경우)
        await Task.Delay(100);
        actions = new OpenQA.Selenium.Interactions.Actions(driver);
        actions.KeyDown(Keys.Control).SendKeys("v").KeyUp(Keys.Control).Perform();
        await Task.Delay(100);
        actions.KeyDown(Keys.Enter).Perform();

        await clipboard.SetTextAsync(content);

        await Task.Delay(3000);

        AddLog(driver.Url);
        if (driver.Url != "https://nid.naver.com/nidlogin.login")
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("성공", "아이디 인증에 성공하였습니다.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            selectedUser.Status = "성공";

            MyDataGrid.ItemsSource = null;
            MyDataGrid.ItemsSource = Users;

            try
            {
                driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(2);
                driver.FindElement(By.Id("new.save")).Click();
            }
            catch (Exception ex)
            {
            }
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);
/*            await Task.Delay(2000);
*/
            AddLog("로그인 성공. 카페 목록을 불러옵니다.");

            // Http 요청을 위해 로그인된 쿠키 세션을 저장
            // 쿠키를 HttpClient에 추가
            CookieCollection cc = new CookieCollection();
            var cookieContainer = new CookieContainer();
            foreach (OpenQA.Selenium.Cookie cook in driver.Manage().Cookies.AllCookies)
            {
                var cookie = new System.Net.Cookie();
                cookie.Name = cook.Name;
                cookie.Value = cook.Value;
                cookie.Domain = cook.Domain;
                cc.Add(cookie);
            }
            cookieContainer.Add(cc);

            /*HttpWebRequest httpWebRequest = (HttpWebRequest)WebRequest.Create("https://www.naver.com");
            httpWebRequest.CookieContainer = cookieContainer;*/

            // HttpClientHandler에 CookieContainer를 설정
            handler = new HttpClientHandler
            {
                CookieContainer = cookieContainer
            };

            await Select_Cafe_SelectionChanged();
        }
        else
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("실패", "아이디 인증에 실패하였습니다.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
        }

        driver.Close();
    }

    // 게시판 목록 불러오기
    public async void GetBoardList(object? sender, SelectionChangedEventArgs e)
    {
        var selectedCafe = SELECT_CAFE.SelectedItem?.ToString();
        if (selectedCafe == null)
        {
/*            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "카페를 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);*/
            return;
        }

        List<string> cafeNameAndCafeurl = boardList[selectedCafe];
        string cafeurl = "https://cafe.naver.com/" + cafeNameAndCafeurl[0];

        boards = new Dictionary<string, string>();
        boards = await GetBoardListAsync(cafeurl);

        // 게시글이 없을경우 return
        if (boards == null)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "선택한 카페는 게시글이 존재하지 않거나 사용 불가능합니다.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        SELECT_BOARD.Items.Clear();
        foreach (var board in boards)
        {
            SELECT_BOARD.Items.Add(board.Value);
        }

        AddLog("해당 카페의 게시판 목록 불러오기 성공.");
    }

    // 말머리 불러오기
    public async void GetMalmuri(object? sender, SelectionChangedEventArgs e)
    {
        var selectedBoardName = SELECT_BOARD.SelectedItem?.ToString();
        var selectedCafeName = SELECT_CAFE.SelectedItem?.ToString();

        if (selectedBoardName == null)
        {
            /*var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "게시판을 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);*/
            return;
        }
        var selectedBoardId = "";
        foreach (var board in boards)
        {
            if (selectedBoardName == board.Value)
            {
                selectedBoardId = board.Key;
                break;
            }
        } 
         
        var cafeId = boardList[selectedCafeName][1];
        var malmuriList = await GetMalmuriAsync(cafeId, selectedBoardId);

        // 말머리 콤보박스에 띄워주기
        SELECT_HEAD_TEXT.Items.Clear();
        foreach (var malmuri in malmuriList)
        {
            SELECT_HEAD_TEXT.Items.Add(malmuri);
        }

        AddLog("말머리 목록 불러오기 성공.");
    }
    
    // 말머리 불러오기 함수
    public async Task<List<string>> GetMalmuriAsync(string cafeId, string menuId)
    {
        int idx = 0;
        while (true)
        {
            List<string> malmuriList = new List<string>();
            // HTTP 요청
            /*var httpClient = new HttpClient(handler);*/ 
            // 페이지 URL 만들기
            string pageUrl = $"https://apis.naver.com/cafe-web/cafe-editor-api/v1.0/cafes/{cafeId}/menus/{menuId}/heads";

            try
            {

                var response = await client.GetAsync(pageUrl);
                response.EnsureSuccessStatusCode();

                // JSON 응답 받기
                var jsonResponse = await response.Content.ReadAsStringAsync();

                // JSON 파싱
                var jsonData = JObject.Parse(jsonResponse);
                var results = jsonData["result"];

                // 카페 이름과 URL 저장
                foreach (var result in results)
                {
                    string malmuri = result["headName"].ToString();

                    malmuriList.Add(malmuri);
                }

                await Task.Delay(100);

                return malmuriList;
            }
            catch (Exception ex)
            {
                AddLog("말머리 목록을 불러오는 도중 오류가 발생했습니다. 해당 문제가 계속된다면 개발자에게 문의해주세요.");
                idx += 1;

                if (idx == 5)
                {
                    return null;
                }

                continue;
            }
        }
    }

    // Task 클래스
    public class TaskData
    {
        public string CafeName { get; set; }
        public string CafeUrl { get; set; }
        public string CafeID { get; set; }
        public string BoardName { get; set; }
        public string BoardID { get; set; }
        public string ID { get; set; }
        public string PW { get; set; }
        public string Malmuri { get; set; }
        public ArticleData Article { get; set; }
        public int ReserveHour { get; set; }
        public int ReserveMinute { get; set; }
        public string Status { get; set; }
        public bool flag { get; set; }
    }

    // 게시글 업로드 Task등록
    public async void UploadTasks(object? sender, RoutedEventArgs e)
    {
        // 콤보박스에서 선택한 아이디의 User 정보 가져오기
        var selectedId = SELECT_ID.SelectedItem?.ToString();
        var selectedUser = Users.FirstOrDefault(user => user.Id == selectedId);

        if (selectedUser == null)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "아이디를 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // selectedUser정보로 아이디와 비밀번호 가져오기
        var id = selectedUser.Id;
        var pw = selectedUser.Password;

        if (id == "" || pw == "")
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "아이디 및 비밀번호를 입력해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // 콤보박스에서 선택한 카페의 url 가져오기
        var selectedCafeName = SELECT_CAFE.SelectedItem?.ToString();

        if (selectedCafeName == null)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "카페를 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        var cafeUrl = boardList[selectedCafeName][0];
        var cafeId = boardList[selectedCafeName][1];

        // 게시판 ID 가져오기
        var selectedBoardName = SELECT_BOARD.SelectedItem?.ToString();
        var boardId = boards.FirstOrDefault(x => x.Value == selectedBoardName).Key;

        if (selectedBoardName == null || boardId == null)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "게시판을 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // 말머리 가져오기
        var malmuri = "";
        if (SELECT_HEAD_TEXT.Items.Count > 0)
        {
            malmuri = SELECT_HEAD_TEXT.SelectedItem?.ToString();

            if (malmuri == null)
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "말머리를 선택해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                return;
            }
        }

        ArticleData selectedArticle = Articles.FirstOrDefault(article => article.ArticleTitle == SELECT_ARTICLE.SelectedItem?.ToString());

        if (selectedArticle == null)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "게시글을 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // Task 추가
        Tasks_.Add(new TaskData
        {
            CafeName = selectedCafeName,
            CafeUrl = cafeUrl,
            CafeID = cafeId,
            BoardName = selectedBoardName,
            BoardID = boardId,
            ID = id,
            PW = pw,
            Malmuri = malmuri,
            Article = selectedArticle,
            ReserveHour = -1,
            ReserveMinute = -1,
            Status = "대기",
            flag = false
        });
    }

    // Task 선택 삭제
    public async void DeleteSelectedTask(object? sender, RoutedEventArgs e)
    {
        System.Collections.IList selectedItems = MyDataGrid3.SelectedItems;

        // 아무것도 선택되지 않았을 때
        if (selectedItems.Count == 0)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "삭제할 작업을 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // 선택된 데이터를 임시 리스트에 저장
        var itemsToDelete = selectedItems.Cast<TaskData>().ToList();

        // 선택된 데이터 삭제
        foreach (var item in itemsToDelete)
        {
            Tasks_.Remove(item);
        }
    }

    // 모든 Task 예약
    public async void ReserveAllTasks(object? sender, RoutedEventArgs e)
    {
        // 예약시간 알아오기
        var reserveHour = (int)RESERVE_HOUR.Value;
        var reserveMinute = (int)RESERVE_MINUTE.Value;

        if (reserveHour > 23 || reserveHour < 0 || reserveMinute > 59 || reserveMinute < 0)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "올바른 시간을 입력해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        foreach (var task in Tasks_)
        {
            task.Status = "예약";
            task.ReserveHour = reserveHour;
            task.ReserveMinute = reserveMinute;
        }

        // Datagrid 내용 업데이트
        MyDataGrid3.ItemsSource = null;
        MyDataGrid3.ItemsSource = Tasks_;
    }

    // 선택한 Task 예약 
    public async void ReserveSelectedTasks(object? sender, RoutedEventArgs e)
    {
        // 예약시간 알아오기
        var reserveHour = (int)RESERVE_HOUR.Value;
        var reserveMinute = (int)RESERVE_MINUTE.Value;

        System.Collections.IList selectedItems = MyDataGrid3.SelectedItems;

        // 아무것도 선택되지 않았을 때
        if (selectedItems.Count == 0)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "예약할 작업을 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // 선택된 데이터를 임시 리스트에 저장
        var itemsToReserve = selectedItems.Cast<TaskData>().ToList();
        foreach (var item in itemsToReserve) {
            item.Status = "예약";
            item.ReserveHour = reserveHour;
            item.ReserveMinute = reserveMinute;
        }

        // Datagrid 내용 업데이트
        MyDataGrid3.ItemsSource = null;
        MyDataGrid3.ItemsSource = Tasks_;
    }
    
    // Task 중지
    public void StopTasks(object? sender, RoutedEventArgs e)
    {
        foreach (TaskData task in Tasks_)
        {
            task.flag = false;
            task.Status = "대기";
        }
    }

    // Task 시작
    public async void StartTasks(object? sender, RoutedEventArgs e)
    {
        // Task 시작
        foreach (var task in Tasks_)
        {
            if (task.Status == "대기" || task.Status == "예약")
            {
                /*task.Status = "진행중";*/
                task.flag = true;
                AddLog("작업을 시작합니다.");
                await Task.Run(() => StartTask(task));
            }
        }
    }

    public async Task StartTask(TaskData task)
    {
        while (!task.flag)
        {
            AddLog("작업이 중지되었습니다. 다시 시작해주세요.");
            return;
        }

        if (task.Status == "예약")
        {
            // 현재 시간 
            DateTime now = DateTime.Now;

            // 예약된 시간
            int hour = (int)task.ReserveHour;
            int minute = (int)task.ReserveMinute;
            DateTime reservedTime = new DateTime(now.Year, now.Month, now.Day, hour, minute, 0);

            // 예약 시간이 지난경우 다음날 같은 시간으로 예약
            if (now > reservedTime)
            {
                reservedTime = reservedTime.AddDays(1);
                AddLog("예약시간이 지나, 다음날의 설정한 시각으로 예약되었습니다.");
            }

            /*if (task.Status != "예약")
            {
                // 타이머 시작
                var timer = new System.Timers.Timer();
                timer.Interval = 1000;
                timer.Elapsed += (sender, e) => AddLog("작업을 시작합니다.");
                timer.Start();
            }*/

            // 대기시간 계산
            TimeSpan waitTime = reservedTime - now;

            // 대기 후 작업 시작 
            await Task.Delay(waitTime);

            AddLog($"{hour}시 {minute}분에 예약된 {task.Article.ArticleTitle} 제목의 작업을 시작합니다.");
        }
        else
        {
            AddLog("예약되어 있지 않습니다. 바로 작업을 시작합니다.");
        }

        task.Status = "진행중";

        // 옵션 불러오기
        bool IsPrivatePhoneNumber;
        bool IsForeverLoop;
        bool IsAutoDelete;
        string RepImagePosition;
        int LoopTimesForDelete;

        string category1;
        string category2;
        string category3;
        int interval;
        string productStatus;
        bool displayPhoneNumber;
        string deliveryType;
        try
        {
             IsPrivatePhoneNumber = this.NaverOptions.IsPrivatePhoneNumber;
             IsForeverLoop = this.NaverOptions.IsForeverLoop;
             IsAutoDelete = this.NaverOptions.IsAutoDelete;
             RepImagePosition = this.NaverOptions.RepImagePosition;
             LoopTimesForDelete = this.NaverOptions.LoopTimes;

             category1 = this.NaverOptions.Category1;
             category2 = this.NaverOptions.Category2;
             category3 = this.NaverOptions.Category3;
             interval = this.NaverOptions.Interval;
             productStatus = this.NaverOptions.ProductStatus;
             displayPhoneNumber = this.NaverOptions.DisplayPhoneNumber;
             deliveryType = this.NaverOptions.ProductDelivery;
        } catch (Exception ex)
        {
            AddLog("옵션을 불러오는 도중 오류가 발생했습니다. 다시 시도해주세요.");
            return;
        }


        /*        if (category1 == "")
                {
                    var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "1차 카테고리를 선택해주세요.", ButtonEnum.Ok);
                    await messageBox.ShowWindowDialogAsync(this);
                    return;
                }
                if (category2 == "")
                {
                    var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "2차 카테고리를 선택해주세요.", ButtonEnum.Ok);
                    await messageBox.ShowWindowDialogAsync(this);
                    return;
                }
                if (category3 == "")
                {
                    var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "3차 카테고리를 선택해주세요.", ButtonEnum.Ok);
                    await messageBox.ShowWindowDialogAsync(this);
                    return;
                }*/

        if (interval < 0)
        {
            await Dispatcher.UIThread.InvokeAsync(async () =>
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "작업 간격을 1초 이상으로 설정해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
            });
            
            return;
        }

        /*if (productStatus == "")
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "상품 상태를 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }*/

        // 무한 루프 설정옵션 true일 시 무한루프 진행
        var idx = 1;
        if (IsForeverLoop)
        {
              idx = 99999;
        }

        //TO-DO : 무한루프 설정옵션 true일 시 무한루프 진행
        /* 
        * 로그인 진행
        */
        AddLog($"{task.ID} 아이디로 로그인합니다.");
        string id = task.ID;
        string pw = task.PW;

        var driverService = ChromeDriverService.CreateDefaultService();
        driverService.HideCommandPromptWindow = true;

        var options = new ChromeOptions();
        options.AddArgument("--disable-gpu");

        /*options.AddArgument("--headless");*/

        /*options.AddArgument("--window-size=1000,1000");*/

        options.AddArgument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36");

        var driver = new ChromeDriver(driverService, options);
        driver.Manage().Window.Maximize();
        driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);

        string login_url = "https://nid.naver.com/nidlogin.login?mode=form&url=https://www.naver.com/";

        while (!task.flag)
        {
            AddLog("작업이 중지되었습니다. 다시 시작해주세요.");
            return;
        }

        driver.Navigate().GoToUrl(login_url);

        while (!task.flag)
        {
            AddLog("작업이 중지되었습니다. 다시 시작해주세요.");
            return;
        }

        // 클립보드로 ID 복사
        var clipboard = this.Clipboard;
        string content = clipboard.GetTextAsync().Result;
        await clipboard.SetTextAsync(id);

        var idField = driver.FindElement(By.Id("id"));
        idField.Click(); // 필드 포커싱 (필요한 경우)
        await Task.Delay(100);
        var actions = new OpenQA.Selenium.Interactions.Actions(driver);
        actions.KeyDown(Keys.Control).SendKeys("v").KeyUp(Keys.Control).Perform();

        // 클립보드로 PW 복사
        await clipboard.SetTextAsync(pw);
        var pwField = driver.FindElement(By.Id("pw"));
        pwField.Click(); // 필드 포커싱 (필요한 경우)
        await Task.Delay(100);
        actions = new OpenQA.Selenium.Interactions.Actions(driver);
        actions.KeyDown(Keys.Control).SendKeys("v").KeyUp(Keys.Control).Perform();
        await Task.Delay(100);
        actions.KeyDown(Keys.Enter).Perform();

        await clipboard.SetTextAsync(content);

        while (!task.flag)
        {
            AddLog("작업이 중지되었습니다. 다시 시작해주세요.");
            return;
        }

        await Task.Delay(3000);

        AddLog($"{task.ID} 로그인 완료.");

        /*
         * 글작성 시작
         */
        for (int i = 0; i < idx; i++)
        {
            AddLog($"{task.CafeName} / {task.BoardName} / {task.Article.ArticleTitle} 작업을 시작합니다.");

            // 게시글 작성 페이지로 이동
            string write_url = $"https://cafe.naver.com/ca-fe/cafes/{task.CafeID}/menus/{task.BoardID}/articles/write?boardType=L";

            driver.Navigate().GoToUrl(write_url);

            // TO-DO : 게시판이 거래 게시판인지, 일반 게시판인지 확인하여 분기처리
            var articleType = "일반";
            try
            {
                driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);
                var element = driver.FindElement(By.ClassName("deal_type"));

                if (element != null)
                {
                    articleType = "거래";
                }
            }
            catch (Exception ex)
            {
                articleType = "일반";
            }

            while (!task.flag)
            {
                AddLog("작업이 중지되었습니다. 다시 시작해주세요.");
                return;
            }

            if (articleType == "거래")
            {
                await WriteDealArticle(driver, task);
            }
            else
            {
                await WriteNormalArticle(driver, task);
            }

            await Task.Delay(interval * 1000);
        }

        // 작업 완료
        AddLog("모든 작업이 완료되었습니다.");
    }

    // 거래 게시판 작성 비동기 함수
    public async Task WriteDealArticle(WebDriver driver, TaskData task)
    {
        var contentField = driver.FindElement(By.ClassName("se-ff-system"));

        await Task.Delay(300);

        // 2024-11-29 TO-DO : 대표 사진이 있다면 등록 (상단, 하단 적용 필요)
        if (this.NaverOptions.RepImagePosition == "상단")
        {
            if (task.Article.ArticleRepPicturePath != null)
            {
                /*// 로컬 파일 경로에서 Base64 문자열로 변환
                string base64Image = ConvertImageToBase64(task.Article.ArticleRepPicturePath);

                if (string.IsNullOrEmpty(base64Image))
                {
                    AddLog("이미지 변환 중 오류가 발생했습니다.");
                    return;
                }

                // JavaScript를 실행하여 Base64 이미지를 에디터에 삽입
                string script = $@"
            (function insertIMGBase64() {{
                var sHTML = '<img src=""data:image/png;base64,{base64Image}"">';
                arguments[0].innerHTML = arguments[1];
            }})();
        ";

                // Selenium을 통해 JavaScript 실행
                IJavaScriptExecutor jsExecutor = (IJavaScriptExecutor)driver;
                jsExecutor.ExecuteScript($@"
            (function insertIMGBase64() {{
                var sHTML = '<img src=""data:image/png;base64,{base64Image}"">';
                arguments[0].innerHTML = sHTML;
            }})();
        ", contentField);

                AddLog("대표 이미지가 에디터에 성공적으로 삽입되었습니다.");
            }*/
                // hidden input 띄우기
                driver.FindElement(By.ClassName("se-image-toolbar-button")).Click();
                await Task.Delay(3000);

                // 1. Find the "파일 열기" dialog window
                IntPtr dialogHandle = FindWindow("#32770", "열기");
                if (dialogHandle == IntPtr.Zero)
                {
                    Console.WriteLine("파일 열기 대화창을 찾을 수 없습니다.");
                    return;
                }

                // 2. Find the "취소" button (Class name: "Button", Text: "취소")
                IntPtr cancelButtonHandle = FindWindowEx(dialogHandle, IntPtr.Zero, "Button", "취소");
                if (cancelButtonHandle == IntPtr.Zero)
                {
                    Console.WriteLine("취소 버튼을 찾을 수 없습니다.");
                    return;
                }

                // 3. Simulate a button click on "취소"
                SendMessage(cancelButtonHandle, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
                Console.WriteLine("취소 버튼을 클릭했습니다.");

                await Task.Delay(1000);
                // hidden input에 사진 삽입
                driver.FindElement(By.Id("hidden-file")).SendKeys(task.Article.ArticleRepPicturePath);

                await Task.Delay(1500);

                // 이미지가 다 전송되었는지 확인 
                while (true)
                {
                    try
                    {
                        driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(1);
                        var success = driver.FindElement(By.CssSelector(".se-state-error"));

                        if (success != null)
                        {
                            continue;
                        }
                    }

                    catch (NoSuchElementException)
                    {
                        // 요소가 존재하지 않으면 루프 종료
                        break;
                    }
                    catch (StaleElementReferenceException)
                    {
                        // 요소가 더 이상 유효하지 않으면 루프 종료
                        break;
                    }
                }
            }
        }

        /*if (task.Article.ArticleRepPicturePath != null)
        {
            // hidden input 띄우기
            driver.FindElement(By.ClassName("se-image-toolbar-button")).Click();
            await Task.Delay(3000);

            // 1. Find the "파일 열기" dialog window
            IntPtr dialogHandle = FindWindow("#32770", "열기");
            if (dialogHandle == IntPtr.Zero)
            {
                Console.WriteLine("파일 열기 대화창을 찾을 수 없습니다.");
                return;
            }

            // 2. Find the "취소" button (Class name: "Button", Text: "취소")
            IntPtr cancelButtonHandle = FindWindowEx(dialogHandle, IntPtr.Zero, "Button", "취소");
            if (cancelButtonHandle == IntPtr.Zero)
            {
                Console.WriteLine("취소 버튼을 찾을 수 없습니다.");
                return;
            }

            // 3. Simulate a button click on "취소"
            SendMessage(cancelButtonHandle, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
            Console.WriteLine("취소 버튼을 클릭했습니다.");

            await Task.Delay(1000);
            // hidden input에 사진 삽입
            driver.FindElement(By.Id("hidden-file")).SendKeys(task.Article.ArticleRepPicturePath);
        }*/

        // 내용 입력 (body에 html넣기)
        var contentDiv = driver.FindElement(By.ClassName("se-text"));
        contentField = contentDiv.FindElement(By.ClassName("se-ff-system"));

        // contentFiled span 태그를 가져온 html로 대체
        string contents = task.Article.ArticleContent;

        // JavaScript를 사용하여 contentField의 innerHTML을 대체
        IJavaScriptExecutor js = (IJavaScriptExecutor)driver;
        /*js.ExecuteScript("arguments[0].innerHTML = arguments[1];", contentField, contents);*/
        /*actions = new OpenQA.Selenium.Interactions.Actions(driver);*/

        // html에서 태그 기준으로 나누기 2024-11-30 테스트 필요.
        //var newContents = AddClassToTags(contents);
        //js.ExecuteScript("arguments[0].innerHTML = arguments[1];", contentField, newContents);
        List<string> actionList = ParseHtmlToActionList(contents).Result;

        await PerformActions(driver, actionList);

        await Task.Delay(1000);

        // 2024-11-29 TO-DO : 대표 사진이 있다면 등록 (상단, 하단 적용 필요)
        if (this.NaverOptions.RepImagePosition == "하단")
        {
            if (task.Article.ArticleRepPicturePath != null)
            {
                driver.FindElement(By.ClassName("se-image-toolbar-button")).Click();
                await Task.Delay(3000);

                // 1. Find the "파일 열기" dialog window
                IntPtr dialogHandle = FindWindow("#32770", "열기");
                if (dialogHandle == IntPtr.Zero)
                {
                    Console.WriteLine("파일 열기 대화창을 찾을 수 없습니다.");
                    return;
                }

                // 2. Find the "취소" button (Class name: "Button", Text: "취소")
                IntPtr cancelButtonHandle = FindWindowEx(dialogHandle, IntPtr.Zero, "Button", "취소");
                if (cancelButtonHandle == IntPtr.Zero)
                {
                    Console.WriteLine("취소 버튼을 찾을 수 없습니다.");
                    return;
                }

                // 3. Simulate a button click on "취소"
                SendMessage(cancelButtonHandle, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
                Console.WriteLine("취소 버튼을 클릭했습니다.");

                await Task.Delay(1000);
                // hidden input에 사진 삽입
                driver.FindElement(By.Id("hidden-file")).SendKeys(task.Article.ArticleRepPicturePath);

                await Task.Delay(1500);

                // 이미지가 다 전송되었는지 확인 
                while (true)
                {
                    try
                    {
                        driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(1);
                        var success = driver.FindElement(By.CssSelector(".se-state-error"));

                        if (success != null)
                        {
                            continue;
                        }
                    }

                    catch (NoSuchElementException)
                    {
                        // 요소가 존재하지 않으면 루프 종료
                        break;
                    }
                    catch (StaleElementReferenceException)
                    {
                        // 요소가 더 이상 유효하지 않으면 루프 종료
                        break;
                    }
                }

                js.ExecuteScript("arguments[0].click();", driver.FindElements(By.ClassName("se-section-image")).Last().FindElement(By.ClassName("se-set-rep-image-button")));

                await Task.Delay(500);
            }
        }

        // 말머리 선택
        var divs = driver.FindElements(By.ClassName("FormSelectButton"));

        // 해당 요소로 스크롤
        js.ExecuteScript("window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });");

        await Task.Delay(500);

        var headText = divs.ElementAt(1);

        headText.Click();
        await Task.Delay(500);

        var headTexts = driver.FindElements(By.CssSelector(".option_list"));
        if (headTexts.ElementAt(1).GetAttribute("style") == "display: none;")
        {
            AddLog("말머리가 존재하지 않는 게시판입니다.");
        }
        else
        {
            var selectedHeadText = headTexts.ElementAt(1).FindElements(By.TagName("li")).FirstOrDefault(li => li.Text.Trim() == task.Malmuri); // 말머리 찾아서 선택
            if (selectedHeadText != null)
            {
                selectedHeadText.Click();
            }
            else
            {
                AddLog("선택한 말머리가 존재하지 않습니다.");
            }
        }


        while (!task.flag)
        {
            AddLog("작업이 중지되었습니다. 다시 시작해주세요.");
            return;
        }

        // 상품명 입력
        var ProductName = task.Article.ArticleTitle;
        var titleField = driver.FindElement(By.ClassName("textarea_input"));
        titleField.Click();
        await Task.Delay(150);

        var actions = new OpenQA.Selenium.Interactions.Actions(driver);
        actions.SendKeys(task.Article.ArticleTitle).Perform();

        // 가격 입력
        var ProductPrice = task.Article.ArticlePrice;
        var priceField = driver.FindElement(By.ClassName("input_text"));
        priceField.Click();
        //priceField.SendKeys(ProductPrice);
        //await Task.Delay(150);

        if (!string.IsNullOrEmpty(task.Article.ArticlePrice))
        {
            actions = new OpenQA.Selenium.Interactions.Actions(driver);
            actions.SendKeys(task.Article.ArticlePrice).Perform();
        }
        else
        {
            actions = new OpenQA.Selenium.Interactions.Actions(driver);
            actions.SendKeys("5000").Perform();
        }

        await Task.Delay(150);

        // 카테고리 선택
        if (!string.IsNullOrEmpty(NaverOptions.Category1))
        {
            driver.FindElement(By.CssSelector(".categories > .BaseButton")).Click();
            await Task.Delay(1000);

            var categoryList = driver.FindElements(By.CssSelector(".category_list > ul"));
            var category1List = categoryList.ElementAt(0).FindElements(By.TagName("li"));

            foreach (var category1 in category1List)
            {
                if (category1.Text.Trim() == NaverOptions.Category1)
                {
                    category1.Click();
                    break;
                }
            }

            await Task.Delay(500);
        }

        if (!string.IsNullOrEmpty(NaverOptions.Category2))
        {
            var categoryList = driver.FindElements(By.CssSelector(".category_list > ul"));
            var category2List = categoryList.ElementAt(1).FindElements(By.TagName("li"));
            foreach (var category2 in category2List)
            {
                if (category2.Text.Trim() == NaverOptions.Category2)
                {
                    category2.Click();
                    break;
                }
            }
            await Task.Delay(500);
        }

        if (!string.IsNullOrEmpty(NaverOptions.Category3))
        {
            var categoryList = driver.FindElements(By.CssSelector(".category_list > ul"));
            var category3List = categoryList.ElementAt(2).FindElements(By.TagName("li"));
            foreach (var category3 in category3List)
            {
                if (category3.Text.Trim() == NaverOptions.Category3)
                {
                    category3.Click();
                    break;
                }
            }
        }

        await Task.Delay(500);
        driver.FindElements(By.CssSelector("a.BaseButton")).ElementAt(1).Click();

        await Task.Delay(500);

        // 상품 상태 선택

        if (!string.IsNullOrEmpty(NaverOptions.ProductStatus))
        {
            var quility_inputs = driver.FindElements(By.CssSelector(".check_quality .input_check"));
            if (NaverOptions.ProductStatus == "미개봉")
            {
                quility_inputs.ElementAt(0).Click();
            }
            else if (NaverOptions.ProductStatus == "거의 새 것")
            {
                quility_inputs.ElementAt(1).Click();
            }
            else if (NaverOptions.ProductStatus == "사용감 있음")
            {
                quility_inputs.ElementAt(2).Click();
            }

            await Task.Delay(500);
        }

        // 배송 방법 

        var delivery_inputs = driver.FindElements(By.CssSelector(".check_delivery .input_check"));
        if (NaverOptions.ProductDelivery == "직거래")
        {
            delivery_inputs.ElementAt(0).Click();
        }
        else if (NaverOptions.ProductDelivery == "택배 거래")
        {
            delivery_inputs.ElementAt(1).Click();
        }
        else if (NaverOptions.ProductDelivery == "온라인 전송")
        {
            delivery_inputs.ElementAt(2).Click();
        }

        // 결제 편의 수단
        var payment_inputs = driver.FindElements(By.Name("deal_type"));
        if (NaverOptions.ProductSafePayment == "N 안전결제")
        {
            js.ExecuteScript("arguments[0].click();", payment_inputs.ElementAt(0).FindElement(By.ClassName("input_check")));
        }
        else if (NaverOptions.ProductSafePayment == "N 일반송금")
        {
            // pass
        }
        else
        {
            // 선택 해제
            js.ExecuteScript("arguments[0].click();", payment_inputs.ElementAt(1).FindElement(By.ClassName("input_check")));
        }

        // 휴대전화번호 노출 및 안심번호 이용 여부
        var div = driver.FindElement(By.ClassName("agree"));

        if (NaverOptions.DisplayPhoneNumber)
        {
            js.ExecuteScript("arguments[0].click();", div.FindElement(By.ClassName("input_check")));
            
            await Task.Delay(500);

            if (NaverOptions.IsPrivatePhoneNumber)
            {
                div = driver.FindElement(By.ClassName("safe_number"));
                js.ExecuteScript("arguments[0].click();", div.FindElement(By.ClassName("input_check")));

                await Task.Delay(500);
            }
        }

        // 태그 입력
        var tagField = driver.FindElement(By.ClassName("tag_input"));

        if (!string.IsNullOrEmpty(task.Article.ArticleTags))
        {
            foreach (string tag in task.Article.ArticleTags.Split(","))
            {
                tagField.SendKeys(tag);
                await Task.Delay(300);
                tagField.SendKeys(Keys.Space);
            }
        }

        // 공개 설정
        driver.FindElement(By.ClassName("btn_open_set")).Click();
        await Task.Delay(300);

        if (task.Article.IsArticlePublic)
        {
            var openButton = driver.FindElements(By.ClassName("input_radio")).First();
            /*openButton.ElementAt(0).Click();*/
            // Selenium을 통해 JavaScript 실행
            js.ExecuteScript("arguments[0].checked = false;", openButton);
        }
        else
        {
            var secretButton = driver.FindElements(By.ClassName("input_radio")).Last();
            js.ExecuteScript("arguments[0].checked = false;", secretButton);
            /*secretButton.ElementAt(1).Click();*/
            await Task.Delay(200);

            if (!task.Article.IsArticleCanSearch)
            {
                var searchButton = driver.FindElement(By.Id("permit"));
                js.ExecuteScript("arguments[0].checked = false;", searchButton);
            }
            else
            {
                var searchButton = driver.FindElement(By.Id("permit"));
                js.ExecuteScript("arguments[0].checked = true;", searchButton);
            }
        }

        await Task.Delay(300);

        // 설정 적용
        var isCanBlogScrap = driver.FindElement(By.Id("blog_sharing"));
        var isCanScrap = driver.FindElement(By.Id("external_sharing"));


        if (task.Article.IsArticleCanScrap)
        {
            js.ExecuteScript("arguments[0].checked = true;", isCanBlogScrap);
            js.ExecuteScript("arguments[0].checked = true;", isCanScrap);
        }
        else
        {
            js.ExecuteScript("arguments[0].checked = false;", isCanBlogScrap);
            js.ExecuteScript("arguments[0].checked = false;", isCanScrap);
        }

        var isCanCopy = driver.FindElement(By.Id("copy"));

        if (task.Article.IsArticleCanCopy)
        {
            js.ExecuteScript("arguments[0].checked = true;", isCanCopy);
        }
        else
        {
            js.ExecuteScript("arguments[0].checked = false;", isCanCopy);
        }
        await Task.Delay(300);

        var isCanCCL = driver.FindElement(By.Id("ccl"));

        if (task.Article.IsArticleCanCCL)
        {
            js.ExecuteScript("arguments[0].checked = true;", isCanCCL);
        }
        else
        {
            js.ExecuteScript("arguments[0].checked = false;", isCanCCL);
        }

        // 게시글 등록 완료
        div = driver.FindElement(By.ClassName("tool_area"));
        var button = div.FindElement(By.TagName("a"));

        if (button.Text.Trim() == "등록")
        {
            button.Click();
        }

        await Task.Delay(1000);

        string currentUrl = driver.Url;

        AddLog($"게시글이 정상적으로 등록되었습니다. {currentUrl}");

        driver.Close();

        task.Status = "완료";

        await Task.Delay(500);

        await Dispatcher.UIThread.InvokeAsync(() =>
        {
            MyDataGrid3.ItemsSource = null;
            MyDataGrid3.ItemsSource = Tasks_;
        });

        // 상품명 (제목)

        // 가격

        // 상품 상태 - 선택 사항 추가

        // 배송 방법 - 선택 사항 추가

        // 결제 편의 수단(N페이 안전결제, N페이 송금, 사용안함(구매자와 협의)) - 선택 사항 추가

        // 휴대전화번호 안심번호 이용 여부

        // 대표 사진 등록(상단, 하단 확인 후 작성)

        // 글 내용 작성

        // 태그 작성
    }

    // 일반 게시판 작성 비동기 함수
    public async Task WriteNormalArticle(WebDriver driver, TaskData task)
    {
        var contentField = driver.FindElement(By.ClassName("se-ff-system"));

        await Task.Delay(300);

        // 2024-11-29 TO-DO : 대표 사진이 있다면 등록 (상단, 하단 적용 필요)
        if (this.NaverOptions.RepImagePosition == "상단")
        {
            if (task.Article.ArticleRepPicturePath != null)
            {
                /*// 로컬 파일 경로에서 Base64 문자열로 변환
                string base64Image = ConvertImageToBase64(task.Article.ArticleRepPicturePath);

                if (string.IsNullOrEmpty(base64Image))
                {
                    AddLog("이미지 변환 중 오류가 발생했습니다.");
                    return;
                }

                // JavaScript를 실행하여 Base64 이미지를 에디터에 삽입
                string script = $@"
            (function insertIMGBase64() {{
                var sHTML = '<img src=""data:image/png;base64,{base64Image}"">';
                arguments[0].innerHTML = arguments[1];
            }})();
        ";

                // Selenium을 통해 JavaScript 실행
                IJavaScriptExecutor jsExecutor = (IJavaScriptExecutor)driver;
                jsExecutor.ExecuteScript($@"
            (function insertIMGBase64() {{
                var sHTML = '<img src=""data:image/png;base64,{base64Image}"">';
                arguments[0].innerHTML = sHTML;
            }})();
        ", contentField);

                AddLog("대표 이미지가 에디터에 성공적으로 삽입되었습니다.");
            }*/
                // hidden input 띄우기
                driver.FindElement(By.ClassName("se-image-toolbar-button")).Click();
                await Task.Delay(3000);

                // 1. Find the "파일 열기" dialog window
                IntPtr dialogHandle = FindWindow("#32770", "열기");
                if (dialogHandle == IntPtr.Zero)
                {
                    Console.WriteLine("파일 열기 대화창을 찾을 수 없습니다.");
                    return;
                }

                // 2. Find the "취소" button (Class name: "Button", Text: "취소")
                IntPtr cancelButtonHandle = FindWindowEx(dialogHandle, IntPtr.Zero, "Button", "취소");
                if (cancelButtonHandle == IntPtr.Zero)
                {
                    Console.WriteLine("취소 버튼을 찾을 수 없습니다.");
                    return;
                }

                // 3. Simulate a button click on "취소"
                SendMessage(cancelButtonHandle, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
                Console.WriteLine("취소 버튼을 클릭했습니다.");

                await Task.Delay(1000);
                // hidden input에 사진 삽입
                driver.FindElement(By.Id("hidden-file")).SendKeys(task.Article.ArticleRepPicturePath);

                await Task.Delay(1500);

                // 이미지가 다 전송되었는지 확인 
                while (true)
                {
                    try
                    {
                        driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(1);
                        var success = driver.FindElement(By.CssSelector(".se-state-error"));

                        if (success != null)
                        {
                            continue;
                        }
                    }

                    catch (NoSuchElementException)
                    {
                        // 요소가 존재하지 않으면 루프 종료
                        break;
                    }
                    catch (StaleElementReferenceException)
                    {
                        // 요소가 더 이상 유효하지 않으면 루프 종료
                        break;
                    }
                }
            }
        }

        /*if (task.Article.ArticleRepPicturePath != null)
        {
            // hidden input 띄우기
            driver.FindElement(By.ClassName("se-image-toolbar-button")).Click();
            await Task.Delay(3000);

            // 1. Find the "파일 열기" dialog window
            IntPtr dialogHandle = FindWindow("#32770", "열기");
            if (dialogHandle == IntPtr.Zero)
            {
                Console.WriteLine("파일 열기 대화창을 찾을 수 없습니다.");
                return;
            }

            // 2. Find the "취소" button (Class name: "Button", Text: "취소")
            IntPtr cancelButtonHandle = FindWindowEx(dialogHandle, IntPtr.Zero, "Button", "취소");
            if (cancelButtonHandle == IntPtr.Zero)
            {
                Console.WriteLine("취소 버튼을 찾을 수 없습니다.");
                return;
            }

            // 3. Simulate a button click on "취소"
            SendMessage(cancelButtonHandle, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
            Console.WriteLine("취소 버튼을 클릭했습니다.");

            await Task.Delay(1000);
            // hidden input에 사진 삽입
            driver.FindElement(By.Id("hidden-file")).SendKeys(task.Article.ArticleRepPicturePath);
        }*/

        // 내용 입력 (body에 html넣기)
        var contentDiv = driver.FindElement(By.ClassName("se-text"));
        contentField = contentDiv.FindElement(By.ClassName("se-ff-system"));

        // contentFiled span 태그를 가져온 html로 대체
        string contents = task.Article.ArticleContent;

        // JavaScript를 사용하여 contentField의 innerHTML을 대체
        IJavaScriptExecutor js = (IJavaScriptExecutor)driver;
        /*js.ExecuteScript("arguments[0].innerHTML = arguments[1];", contentField, contents);*/
        /*actions = new OpenQA.Selenium.Interactions.Actions(driver);*/

        // html에서 태그 기준으로 나누기 2024-11-30 테스트 필요.
        //var newContents = AddClassToTags(contents);
        //js.ExecuteScript("arguments[0].innerHTML = arguments[1];", contentField, newContents);
        List<string> actionList = ParseHtmlToActionList(contents).Result;

        await PerformActions(driver, actionList);

        await Task.Delay(1000);

        // 2024-11-29 TO-DO : 대표 사진이 있다면 등록 (상단, 하단 적용 필요)
        if (this.NaverOptions.RepImagePosition == "하단")
        {
            if (task.Article.ArticleRepPicturePath != null)
            {
                driver.FindElement(By.ClassName("se-image-toolbar-button")).Click();
                await Task.Delay(3000);

                // 1. Find the "파일 열기" dialog window
                IntPtr dialogHandle = FindWindow("#32770", "열기");
                if (dialogHandle == IntPtr.Zero)
                {
                    Console.WriteLine("파일 열기 대화창을 찾을 수 없습니다.");
                    return;
                }

                // 2. Find the "취소" button (Class name: "Button", Text: "취소")
                IntPtr cancelButtonHandle = FindWindowEx(dialogHandle, IntPtr.Zero, "Button", "취소");
                if (cancelButtonHandle == IntPtr.Zero)
                {
                    Console.WriteLine("취소 버튼을 찾을 수 없습니다.");
                    return;
                }

                // 3. Simulate a button click on "취소"
                SendMessage(cancelButtonHandle, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
                Console.WriteLine("취소 버튼을 클릭했습니다.");

                await Task.Delay(1000);
                // hidden input에 사진 삽입
                driver.FindElement(By.Id("hidden-file")).SendKeys(task.Article.ArticleRepPicturePath);

                await Task.Delay(1500);

                // 이미지가 다 전송되었는지 확인 
                while (true)
                {
                    try
                    {
                        driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(1);
                        var success = driver.FindElement(By.CssSelector(".se-state-error"));

                        if (success != null)
                        {
                            continue;
                        }
                    }

                    catch (NoSuchElementException)
                    {
                        // 요소가 존재하지 않으면 루프 종료
                        break;
                    }
                    catch (StaleElementReferenceException)
                    {
                        // 요소가 더 이상 유효하지 않으면 루프 종료
                        break;
                    }
                }

                // 마지막 요소 대표 버튼 클릭
                //var rep_buttons = driver.FindElements(By.ClassName("se-set-rep-image-button-text")).Last();

                // Javascript로 실행
                js.ExecuteScript("arguments[0].click();", driver.FindElements(By.ClassName("se-section-image")).Last().FindElement(By.ClassName("se-set-rep-image-button")));

                await Task.Delay(500);
            }
        }

        // 페이지 스크롤 맨위로 올리기
        driver.ExecuteScript("window.scrollTo(0, 0);");

        await Task.Delay(500);

        // 말머리 선택
        var divs = driver.FindElements(By.ClassName("FormSelectButton"));
        var headText = divs.ElementAt(1);

        headText.Click();
        await Task.Delay(500);

        var headTexts = driver.FindElements(By.CssSelector(".option_list"));
        if (headTexts.ElementAt(1).GetAttribute("style") == "display: none;"){
            AddLog("말머리가 존재하지 않는 게시판입니다.");
        }
        else
        {
            var selectedHeadText = headTexts.ElementAt(1).FindElements(By.TagName("li")).FirstOrDefault(li => li.Text.Trim() == task.Malmuri); // 말머리 찾아서 선택
            if (selectedHeadText != null)
            {
                selectedHeadText.Click();
            }
            else
            {
                AddLog("선택한 말머리가 존재하지 않습니다.");
            }
        }

        
        while (!task.flag)
        {
            AddLog("작업이 중지되었습니다. 다시 시작해주세요.");
            return;
        }

        // 제목 입력
        var titleField = driver.FindElement(By.ClassName("textarea_input"));
        titleField.Click();
        await Task.Delay(150);

        var actions = new OpenQA.Selenium.Interactions.Actions(driver);
        actions.SendKeys(task.Article.ArticleTitle).Perform();

        // 태그 입력
        var tagField = driver.FindElement(By.ClassName("tag_input"));
        
        if (!string.IsNullOrEmpty(task.Article.ArticleTags))
        {
            foreach (string tag in task.Article.ArticleTags.Split(","))
            {
                tagField.SendKeys(tag);
                await Task.Delay(300);
                tagField.SendKeys(Keys.Space);
            }
        }
      
        // 공개 설정
        driver.FindElement(By.ClassName("btn_open_set")).Click();
        await Task.Delay(300);

        if (task.Article.IsArticlePublic)
        {
            var openButton = driver.FindElements(By.ClassName("input_radio"));
            /*openButton.ElementAt(0).Click();*/
            // Selenium을 통해 JavaScript 실행
            js.ExecuteScript("arguments[0].checked = false;", openButton);
        }
        else
        {
            var secretButton = driver.FindElements(By.ClassName("input_radio"));
            js.ExecuteScript("arguments[0].checked = false;", secretButton);
            /*secretButton.ElementAt(1).Click();*/
            await Task.Delay(200);

            if (!task.Article.IsArticleCanSearch)
            {
                var searchButton = driver.FindElement(By.Id("permit"));
                js.ExecuteScript("arguments[0].checked = false;", searchButton);
            }
            else
            {
                var searchButton = driver.FindElement(By.Id("permit"));
                js.ExecuteScript("arguments[0].checked = true;", searchButton);
            }
        }

        await Task.Delay(300);

        // 설정 적용
        var isCanBlogScrap = driver.FindElement(By.Id("blog_sharing"));
        var isCanScrap = driver.FindElement(By.Id("external_sharing"));


        if (task.Article.IsArticleCanScrap)
        {
            js.ExecuteScript("arguments[0].checked = true;", isCanBlogScrap);
            js.ExecuteScript("arguments[0].checked = true;", isCanScrap);
        }
        else
        {
            js.ExecuteScript("arguments[0].checked = false;", isCanBlogScrap);
            js.ExecuteScript("arguments[0].checked = false;", isCanScrap);
        }

        var isCanCopy = driver.FindElement(By.Id("copy"));

        if (task.Article.IsArticleCanCopy)
        {
            js.ExecuteScript("arguments[0].checked = true;", isCanCopy);
        }
        else
        {
            js.ExecuteScript("arguments[0].checked = false;", isCanCopy);
        }
        await Task.Delay(300);

        var isCanCCL = driver.FindElement(By.Id("ccl"));

        if (task.Article.IsArticleCanCCL)
        {
            js.ExecuteScript("arguments[0].checked = true;", isCanCCL);
        }
        else
        {
            js.ExecuteScript("arguments[0].checked = false;", isCanCCL);
        }

        // 게시글 등록 완료
        var div = driver.FindElement(By.ClassName("tool_area"));
        var button = div.FindElement(By.TagName("a"));

        if (button.Text.Trim() == "등록")
        {
            button.Click();
        }

        await Task.Delay(1000);

        string currentUrl = driver.Url;

        AddLog($"게시글이 정상적으로 등록되었습니다. {currentUrl}");

        driver.Close();

        task.Status = "완료";

        await Task.Delay(500);

        await Dispatcher.UIThread.InvokeAsync(() =>
        {
            MyDataGrid3.ItemsSource = null;
            MyDataGrid3.ItemsSource = Tasks_;
        });
    }

    public async Task<List<string>> ParseHtmlToActionList(string htmlContent)
    {
        var actionsList = new List<string>();

        // json decode 진행
        /*string decodedString = JsonConvert.DeserializeObject<string>(@"""" + htmlContent + @"""");*/

        var htmlDoc = new HtmlDocument();
        htmlDoc.LoadHtml(htmlContent);

        // DocumentNode 아래의 모든 자식 노드를 처리
        await ProcessNode(htmlDoc.DocumentNode, actionsList);

        for (int i = 0; i < actionsList.Count; i++)
        {
            actionsList[i] = actionsList[i].Replace("&nbsp;", " ");
        }

        return actionsList;
    }

    // 재귀적으로 HTML 노드 처리
    private async Task ProcessNode(HtmlNode node, List<string> actionsList)
    {
        foreach (var childNode in node.ChildNodes)
        {
            if (childNode.Name == "p") // <p> 태그
            {
                await ProcessNode(childNode, actionsList); // 자식 노드 재귀 처리
            }
            else if (childNode.Name == "br") // <br> 태그
            {
                actionsList.Add("\n");
            }
            else if (childNode.Name == "img") // <img> 태그
            {
                var imagePath = childNode.GetAttributeValue("src", null);
                if (imagePath != null)
                {
                    actionsList.Add($"[IMG:{imagePath}]");
                }
            }
            else if (childNode.NodeType == HtmlNodeType.Text) // 텍스트 노드
            {
                var text = childNode.InnerText.Trim();
                if (!string.IsNullOrEmpty(text))
                {
                    actionsList.Add(text);
                }
            }
            else
            {
                // 처리할 필요 없는 태그는 무시
                await ProcessNode(childNode, actionsList);
            }
        }
    }

    public async Task PerformActions(WebDriver driver, List<string> actionsList)
    {
        // Actions 객체 생성
        var actions = new OpenQA.Selenium.Interactions.Actions(driver);

        foreach (var action in actionsList)
        {
            if (action.StartsWith("[IMG:")) // 이미지 입력
            {
                var imagePath = action.Substring(5, action.Length - 6); // [IMG:] 제거

                driver.FindElement(By.ClassName("se-image-toolbar-button")).Click();
                await Task.Delay(3000);

                // 1. Find the "파일 열기" dialog window
                IntPtr dialogHandle = FindWindow("#32770", "열기");
                if (dialogHandle == IntPtr.Zero)
                {
                    Console.WriteLine("파일 열기 대화창을 찾을 수 없습니다.");
                    return;
                }

                // 2. Find the "취소" button (Class name: "Button", Text: "취소")
                IntPtr cancelButtonHandle = FindWindowEx(dialogHandle, IntPtr.Zero, "Button", "취소");
                if (cancelButtonHandle == IntPtr.Zero)
                {
                    Console.WriteLine("취소 버튼을 찾을 수 없습니다.");
                    return;
                }

                // 3. Simulate a button click on "취소"
                SendMessage(cancelButtonHandle, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
                Console.WriteLine("취소 버튼을 클릭했습니다.");

                await Task.Delay(1000);
                driver.FindElement(By.Id("hidden-file")).SendKeys(imagePath);
                await Task.Delay(1500);

                // 이미지가 다 전송되었는지 확인 
                while (true)
                {
                    try
                    {
                        driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(1);
                        var success = driver.FindElement(By.CssSelector(".se-state-error"));

                        if (success != null)
                        {
                            continue;
                        }
                    }

                    catch (NoSuchElementException)
                    {
                        // 요소가 존재하지 않으면 루프 종료
                        break;
                    }
                    catch (StaleElementReferenceException)
                    {
                        // 요소가 더 이상 유효하지 않으면 루프 종료
                        break;
                    }
                }
            }
            else if (action == "\n") // 줄바꿈
            {
                actions.SendKeys(Keys.Enter);
                actions.Perform(); // ActionChain 실행
                await Task.Delay(100);
            }
            else // 일반 텍스트
            {
                actions.SendKeys(action).SendKeys(Keys.Enter);
                actions.Perform(); // ActionChain 실행
                await Task.Delay(100);
            }
        }
    }

    public string AddClassToTags(string htmlContent)
    {
        // HTML 파서 초기화
        var htmlDoc = new HtmlDocument();
        htmlDoc.LoadHtml(htmlContent);

        // 모든 <p> 태그에 class 추가
        var pTags = htmlDoc.DocumentNode.SelectNodes("//p");
        if (pTags != null)
        {
            foreach (var pTag in pTags)
            {
                string existingClass = pTag.GetAttributeValue("class", string.Empty);
                pTag.SetAttributeValue("class", $"{existingClass} se-ff-system se-fs15 __se-node".Trim());
            }
        }

        // 모든 <img> 태그에 class 추가
        var imgTags = htmlDoc.DocumentNode.SelectNodes("//img");
        if (imgTags != null)
        {
            foreach (var imgTag in imgTags)
            {
                string existingClass = imgTag.GetAttributeValue("class", string.Empty);
                imgTag.SetAttributeValue("class", $"{existingClass} se-module se-module-image __se-unit se-is-activated".Trim());
            }
        }

        // HTML 문자열로 다시 변환
        return htmlDoc.DocumentNode.OuterHtml;
    }

    // 이미지 base64 인코딩
    private string ConvertImageToBase64(string filePath)
    {
        try
        {
            byte[] imageBytes = System.IO.File.ReadAllBytes(filePath);
            return Convert.ToBase64String(imageBytes);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"이미지를 Base64로 변환하는 중 오류 발생: {ex.Message}");
            return null;
        }
    }

    public async void OpenOptionPopup(object? sender, RoutedEventArgs e)
    {
        var optionPopup = new NaverWritingOptionPopup(this, this.NaverOptions);
        /*await optionPopup.ShowDialog<string?>(this);*/

        // 팝업에서 반환된 값을 대기
        var result = await optionPopup.ShowDialog<OptionTask>(this);

        if (result != null)
        {
            // 반환된 값을 사용
            this.NaverOptions = result;
            AddLog($"옵션이 정상적으로 설정되었습니다.");
        }
        else
        {
            AddLog("옵션 변경이 취소되었습니다.");
        }
    }

    // 모든 세팅 저장
    public async void SaveAllSettings(object? sender, RoutedEventArgs e)
    {
        try
        {
            // 유저 정보 저장
            var users = JsonConvert.SerializeObject(this.Users);
            await File.WriteAllTextAsync("users.json", users);

            // 게시글 정보 저장
            var articles = JsonConvert.SerializeObject(this.Articles);
            await File.WriteAllTextAsync("articles.json", articles);

            // 옵션 정보 저장
            var options = JsonConvert.SerializeObject(this.NaverOptions);
            await File.WriteAllTextAsync("options.json", options);

            AddLog("유저, 게시글, 옵션 세팅 정보가 정상적으로 저장되었습니다.");
        }
        catch (Exception ex)
        {
            AddLog("유저, 게시글, 옵션 세팅 정보 저장 중 에러가 발생하였습니다.");
        }
    }

    // 모든 세팅 초기화
    public async void ResetAllSettings(object? sender, RoutedEventArgs e)
    {
        try
        {
            // 유저 정보 초기화
            this.Users = new ObservableCollection<UserData>();
            MyDataGrid.ItemsSource = null;
            MyDataGrid.ItemsSource = Users;

            // 게시글 정보 초기화
            this.Articles = new ObservableCollection<ArticleData>();
            MyDataGrid2.ItemsSource = null;
            MyDataGrid2.ItemsSource = Articles;

            // task 정보 초기화
            this.Tasks_ = new ObservableCollection<TaskData>();
            MyDataGrid3.ItemsSource = null;
            MyDataGrid3.ItemsSource = Tasks_;

            // 옵션 정보 초기화
            this.NaverOptions = new OptionTask();
            NaverOptions.IsPrivatePhoneNumber = false;
            NaverOptions.DisplayPhoneNumber = false;
            NaverOptions.IsForeverLoop = false;
            NaverOptions.IsAutoDelete = false;
            NaverOptions.RepImagePosition = "상단";
            NaverOptions.LoopTimes = 1;
            NaverOptions.Interval = 30;
            NaverOptions.DisplayPhoneNumber = false;
            NaverOptions.ProductStatus = "";
            NaverOptions.ProductDelivery = "";
            NaverOptions.ProductSafePayment = "";

            // 모든 콤보박스 초기화
            SELECT_ARTICLE.Items.Clear();
            SELECT_ID.Items.Clear();
            SELECT_HEAD_TEXT.Items.Clear();
            SELECT_BOARD.Items.Clear();
            SELECT_CAFE.Items.Clear();

            AddLog("유저, 게시글, 옵션 세팅 정보가 정상적으로 초기화되었습니다.");
        }
        catch (Exception ex)
        {
            AddLog("유저, 게시글, 옵션 세팅 정보 초기화 중 에러가 발생하였습니다.");
        }
    }

    // 로그 저장 
    public async void SaveLog(object? sender, RoutedEventArgs e)
    {
        try
        {
            // 로그 정보 저장 - 파일 이름에 날짜와 시간 포함
            var logText = this.LogTextBox.Text;
            var timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss"); // 현재 날짜 및 시간
            var fileName = $"logs_{timestamp}.txt"; // 파일 이름 생성
            await File.WriteAllTextAsync(fileName, logText);
            AddLog($"로그 정보가 '{fileName}'에 정상적으로 저장되었습니다.");
        }
        catch (Exception ex)
        {
            AddLog("로그 정보 저장 중 에러가 발생하였습니다.");
        }
    }
}