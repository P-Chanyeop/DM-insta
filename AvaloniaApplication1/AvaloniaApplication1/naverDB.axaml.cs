using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Markup.Xaml;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.IO;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using System.Net;
using System.ComponentModel;
using OfficeOpenXml;
using Newtonsoft.Json;
using System.Threading.Tasks;
using MsBox.Avalonia.Base;
using TextCopy;
using System.Runtime.CompilerServices;
using System.Diagnostics;
using System.Web;
using System.Text.RegularExpressions;
using MsBox.Avalonia.Enums;
using MsBox.Avalonia;
using Newtonsoft.Json.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text;
using System.ComponentModel.Design.Serialization;
using HtmlAgilityPack;



namespace AvaloniaApplication1;

public partial class naverDB : Window
{
    string extract_filePath = "";
    string except_filePath = "";
    string target_url;
    string target_url_type;     // 카페 or 게시판 주소인지 체크
    bool is_login_success = false;
    string start_date_str = "";
    string end_date_str = "";
    List<string> extract_id_list = new List<string>();
    List<List<string>> extract_db_list = new List<List<string>>();
    List<string> extract_nickname_list = new List<string>();
    List<string> extract_keyword_list = new List<string>();
    List<string> except_keyword_list = new List<string>();

    string ID = "";
    string PW = "";

    string selectdOption1 = "";
    string selectdOption2 = "";
    string selectdOption3 = "";
    string api_key = "";

    string target_clubid = "";

    ChromeDriver driver;
    public CookieContainer Cookie { get; private set; }

    /*public ObservableCollection<Person> People { get; }*/
    public ObservableCollection<DB_data> Data_ { get; }

    // 기본 생성자
    public naverDB()
    {
    }

    public naverDB(string apiKey, string responseText)
    {
        InitializeComponent();

        this.api_key = apiKey;

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

        /*AddLog($"사용중인 API Key: {this.api_key.Replace(this.api_key.Substring(1, 3), "***")}");*/

        // 라디오 버튼에 이벤트 핸들러 추가
        sim.Checked += RadioButton_Checked1;
        date.Checked += RadioButton_Checked1;

        All.Checked += RadioButton_Checked2;
        day.Checked += RadioButton_Checked2;
        week.Checked += RadioButton_Checked2;
        year.Checked += RadioButton_Checked2;
        etc.Checked += RadioButton_Checked2;
/*
        Auto.Checked += RadioButton_Checked3;
        Manual.Checked += RadioButton_Checked3;*/

        /*var people = new List<Person>
            {
                new Person("Neil", "Armstrong"),
                new Person("Buzz", "Lightyear"),
                new Person("James", "Kirk"),
                new Person("Neil", "Armstro,ng"),
                new Person("Buzz", "Lightye,ar"),
                new Person("James", "Kirk"),
                new Person("Neil", "Armstro,ng"),
                new Person("Buzz", "Lightye,ar"),
                new Person("James", "Kirk"),
                new Person("Neil", "Armstro,ng"),
                new Person("Buzz", "Lightye,ar"),
                new Person("James", "Kirk"),
                new Person("Neil", "Armstro,ng"),
                new Person("Buzz", "Lightye,ar"),
                new Person("James", "Kirk"),
                new Person("Neil", "Armstro,ng"),
                new Person("Buzz", "Lightye,ar"),
                new Person("James", "Kirk"),
                new Person("Neil", "Armstrong"),
                new Person("Buzz", "Lightyear"),
                new Person("James", "Kirk")
            };
        People = new ObservableCollection<Person>(people);*/
        var data_ = new List<DB_data>
        {

        };
        Data_ = new ObservableCollection<DB_data>(data_);

        // DataContext 설정
        DataContext = this;

        // 사이즈 조절 불가능하게 설정
        this.CanResize = false;

        // 타겟 URL 주소 초기화
        this.target_url = "";

        AddLog("프로그램이 정상 실행되었습니다.");

        // 엑셀 저장을 위한 EPPlus 라이브러리 초기화
        ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;

        // 저장 데이터가 존재하면 불러오기
        if (File.Exists("input_data.json"))
        {
            load_data_from_json();
        }
    }

    public class Person
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }

        public Person(string firstName, string lastName)
        {
            FirstName = firstName;
            LastName = lastName;
        }
    }
    public class DB_data
    {
        public string 아이디 { get; set; }
        public string 전화번호 { get; set; }
        public string 지역 { get; set; }

        public DB_data(string userId, string phoneNumber, string location)
        {
            this.아이디 = userId;
            this.전화번호 = phoneNumber;
            this.지역 = location;
        }
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

    private void Open_Start_Calendar(object? sender, GotFocusEventArgs e)
    {
        if (sender is TextBox textBox)
        {
            if (textBox.Name != null && textBox.Name.Equals("DateDisplay"))
            {
                // 캘린더를 표시
                CalendarControl.IsVisible = true;
                CalendarGrid.ColumnDefinitions.ElementAt(0).Width = new GridLength(2, GridUnitType.Star);
                CalendarGrid.ColumnDefinitions.ElementAt(1).Width = new GridLength(1, GridUnitType.Star);
                DateDisplay2.IsEnabled = false;
            }
        }
    }

    private void Open_End_Calendar(object? sender, GotFocusEventArgs e)
    {
        if (sender is TextBox textBox)
        {
            if (textBox.Name != null && textBox.Name.Equals("DateDisplay2"))
            {
                // 캘린더를 표시
                CalendarControl2.IsVisible = true;
                CalendarGrid.ColumnDefinitions.ElementAt(0).Width = new GridLength(1, GridUnitType.Star);
                CalendarGrid.ColumnDefinitions.ElementAt(1).Width = new GridLength(2, GridUnitType.Star);
                DateDisplay.IsEnabled = false;
            }
        }
    }

    // 날짜 선택 시 호출되는 이벤트 핸들러
    private void Start_Calendar_SelectedDateChanged(object? sender, SelectionChangedEventArgs e)
    {
        if (sender is Calendar calendar && calendar.SelectedDate.HasValue)
        {
            // 캘린더 정렬
            CalendarGrid.ColumnDefinitions.ElementAt(0).Width = new GridLength(1, GridUnitType.Star);
            CalendarGrid.ColumnDefinitions.ElementAt(1).Width = new GridLength(1, GridUnitType.Star);

            try
            {
                // 선택된 날짜를 yyyy-MM-dd 형식의 문자열로 변환하여 TextBox에 표시
                DateDisplay.Text = CalendarControl.SelectedDate.Value.ToString("yyyy-MM-dd");

                // 선택된 날짜를 yyyy-MM-dd 형식의 문자열로 변환하여 TextBox에 표시
                DateDisplay2.Text = CalendarControl2.SelectedDate.Value.ToString("yyyy-MM-dd");

                Console.WriteLine(DateDisplay.Text, DateDisplay2.Text);
                // DateDisplay와 DateDisplay2의 텍스트를 DateTime으로 변환
                DateTime startDate = DateTime.ParseExact(DateDisplay.Text, "yyyy-MM-dd", null);
                DateTime endDate = DateTime.ParseExact(DateDisplay2.Text, "yyyy-MM-dd", null);

                if (endDate < startDate)
                {
                    DateDisplay2.Text = DateDisplay.Text;
                    CalendarControl.SetValue(Calendar.SelectedDateProperty, CalendarControl.SelectedDate);
                }
            }
            catch (Exception ex)
            {
                // pass
            }

            // 캘린더 숨기기
            calendar.IsVisible = false;

            DateDisplay2.IsEnabled = true;
        }
    }

    // Test 필요.
    private void End_Calendar_SelectedDateChanged(object? sender, SelectionChangedEventArgs e)
    {
        if (sender is Calendar calendar && calendar.SelectedDate.HasValue)
        {
            // 캘린더 정렬
            CalendarGrid.ColumnDefinitions.ElementAt(0).Width = new GridLength(1, GridUnitType.Star);
            CalendarGrid.ColumnDefinitions.ElementAt(1).Width = new GridLength(1, GridUnitType.Star);

            try
            {
                // 선택된 날짜를 yyyy-MM-dd 형식의 문자열로 변환하여 TextBox에 표시
                DateDisplay.Text = CalendarControl.SelectedDate.Value.ToString("yyyy-MM-dd");

                // 선택된 날짜를 yyyy-MM-dd 형식의 문자열로 변환하여 TextBox에 표시
                DateDisplay2.Text = CalendarControl2.SelectedDate.Value.ToString("yyyy-MM-dd");

                Console.WriteLine(DateDisplay.Text, DateDisplay2.Text);
                // DateDisplay와 DateDisplay2의 텍스트를 DateTime으로 변환
                DateTime startDate = DateTime.ParseExact(DateDisplay.Text, "yyyy-MM-dd", null);
                DateTime endDate = DateTime.ParseExact(DateDisplay2.Text, "yyyy-MM-dd", null);

                if (endDate < startDate)
                {
                    DateDisplay.Text = DateDisplay2.Text;
                    CalendarControl.SetValue(Calendar.SelectedDateProperty, CalendarControl2.SelectedDate);
                }
            }
            catch (Exception ex)
            {
                // pass
            }

            // 캘린더 숨기기
            calendar.IsVisible = false;

            DateDisplay.IsEnabled = true;
        }
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
        if (this.is_login_success)
        {
            this.driver.Quit();
            
            // 윈도우 종료 후 로그인창으로 이동
            this.Close();
            new MainWindow().Show();

            AddLog("로그아웃 되었습니다.");
            this.is_login_success = false;
        }
        else
        {
            AddLog("로그인이 되어있지 않습니다.");
        }
    }


    // 로그 추가 메서드
    public void AddLog(string message)
    {
        LogTextBox.Text += DateTime.Now + " " + message + "\n";
        LogTextBox.CaretIndex = LogTextBox.Text.Length;  // 스크롤을 맨 아래로 이동
    }

    // Clear Logs 버튼 클릭 이벤트
    private void OnClearLogs(object? sender, RoutedEventArgs e)
    {
        LogTextBox.Clear();
    }

    private async void Start_macro(object? sender, RoutedEventArgs e)
    {
        // 네이버 로그인
        // 로그인 메서드 비동기 호출
        await Login_naver();
        await Task.Delay(1000);

        // grid 내역 초기화
        MyDataGrid.ItemsSource = null;
        MyDataGrid.ItemsSource = Data_;

        /*        await Get_id_list();
                await Task.Delay(1000);*/
        //await Request_DB_data();
        await Request_DB_data_by_requests();
        await Task.Delay(1000);
    }

    private async Task Login_naver()
    {
        try
        {
            string ID = this.Id_input.Text;
            string PW = this.Pw_input.Text;

            if (string.IsNullOrEmpty(ID) || string.IsNullOrEmpty(PW))
            {
                AddLog("아이디 또는 비밀번호를 입력해주세요.");
                return;
            }

            // ChromeDriver 경로 설정 (환경 변수에 추가했으면 생략 가능)
            var chromeDriverService = ChromeDriverService.CreateDefaultService();
            // 프롬프트 창 숨기기
            chromeDriverService.HideCommandPromptWindow = true;

            var chromeOptions = new ChromeOptions();
            /*chromeOptions.AddArgument("--headless");*/

            // ChromeDriver 인스턴스 생성
            this.driver = new ChromeDriver(chromeDriverService, chromeOptions);
            this.driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);

            // 네이버 로그인 수행
            this.is_login_success = true;

            this.driver.Navigate().GoToUrl("https://nid.naver.com/nidlogin.login");

            Clipboard clipboard = new();
            clipboard.SetText(ID);

            await Task.Delay(500);

            this.driver.FindElement(By.Id("id")).SendKeys(OpenQA.Selenium.Keys.Control + 'v');

            clipboard.SetText(PW);

            await Task.Delay(500);

            this.driver.FindElement(By.Id("pw")).SendKeys(OpenQA.Selenium.Keys.Control + 'v');
            this.driver.FindElement(By.Id("pw")).SendKeys(OpenQA.Selenium.Keys.Enter);

            await Task.Delay(1500);

            // 로그인이 정상적으로 되었는지 체크
            if (this.driver.Url.Contains("nidlogin.login"))
            {
                AddLog("로그인에 실패하였습니다. 아이디와 비밀번호를 확인해주세요.");
                driver.Quit();
                this.is_login_success = false;
                return;
            }

            AddLog("로그인에 성공하였습니다.");
        }
        catch (Exception ex)
        {
            Console.WriteLine("로그인 중 에러발생. 해당 현상이 계속 발생 시, 개발자에게 문의해주세요." + ex.Message);
            AddLog("로그인 실패. 해당 현상이 계속 발생 시, 개발자에게 문의해주세요.");

            this.is_login_success = false;
            this.driver.Quit();
            return;
        }
    }
    private async void Extract_id_thread(object sender, RoutedEventArgs e)
    {
        // ID 추출 시작
        await Task.WhenAll(Get_id_list());
    }

    // 대상 아이디 추출
    private async Task Get_id_list()
    {
        // 로그인이 안되어 있을 시, 로그인을 먼저 수행하도록 메세지 출력
        if (!is_login_success)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "네이버 로그인이 되어있지 않습니다. 로그인 후 다시 시도해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // 타겟주소가 설정되어 있지 않을 시, 설정하도록 메세지 출력
        target_url = this.cafe_url_input.Text ?? string.Empty;
        if (string.IsNullOrWhiteSpace(target_url))
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "타겟 URL 주소가 설정되어 있지 않습니다. 설정 후 다시 시도해주세요", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // 추출 키워드 리스트
        List<string> extract_keywords = extract_keyword_list;

        if (extract_keywords.Count == 0)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "추출 키워드가 설정되어 있지 않습니다. 최소 1개 설정 후 다시 시도해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        // DB 추출 버튼 활성화
        /*this.extract_db_btn.Enabled = true;*/

        // 제외 키워드 리스트
        List<string> except_keywords = except_keyword_list;

        // 관련도 및 최신순 설정 불러오기
        string order_type = "";

        switch (this.selectdOption1)
        {
            case "sim":
                order_type = "sim";
                break;
            case "date":
                order_type = "date";
                break;
            default:
                order_type = "sim";
                break;
        }

        Console.WriteLine($"정렬 기준 : {order_type}");

        // 기간 설정 불러오기
        start_date_str = DateDisplay.Text ?? DateTime.Now.ToString("yyyy/MM/dd");
        end_date_str = DateDisplay2.Text ?? DateTime.Now.ToString("yyyy/MM/dd");

        // 2024년 7월 11일 목요일 -> 20240711로 변경
        start_date_str = Change_date(start_date_str);
        end_date_str = Change_date(end_date_str);
        Console.WriteLine($"시작 날짜 : {start_date_str}");
        Console.WriteLine($"종료 날짜 : {end_date_str}");

        // 페이지 설정 불러오기
        int default_start_page = 1;
        
        // 페이지 설정이 숫자인지 판별
        if (!int.TryParse(this.start_page_input.Text, out default_start_page))
        {
            // 시작 실패 시 메시지박스를 띄웁니다.
            var messageBox = MessageBoxManager.GetMessageBoxStandard("페이지 설정 실패.", "페이지 설정에는 숫자만 입력할 수 있습니다.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            /*AddLog("시작 페이지는 숫자로 입력해주세요.");*/
            return;
        }
        if (!int.TryParse(this.end_page_input.Text, out default_start_page))
        {
            // 시작 실패 시 메시지박스를 띄웁니다.
            var messageBox = MessageBoxManager.GetMessageBoxStandard("페이지 설정 실패.", "페이지 설정에는 숫자만 입력할 수 있습니다.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            /*AddLog("시작 페이지는 숫자로 입력해주세요.");*/
            return;
        }
        int start_page = (int)this.start_page_input.Value;
        int end_page = (int)this.end_page_input.Value;
        Console.WriteLine($"시작 페이지 : {start_page}");
        Console.WriteLine($"종료 페이지 : {end_page}");

        // 대상 아이디 추출
        //this.driver.Navigate().GoToUrl(this.target_url);    // 타겟 URL 접속 

        // 검색창에 공백 검색
        // this.driver.SwitchTo().Frame(this.driver.FindElement(By.Id("cafe_main")));
        //this.driver.FindElement(By.Id("topLayerQueryInput")).SendKeys(".");
        //this.driver.FindElement(By.Id("topLayerQueryInput")).SendKeys(OpenQA.Selenium.Keys.Enter);

        // 프레임 변경
        //this.driver.SwitchTo().Frame(this.driver.FindElement(By.Id("cafe_main")));

        // 표시 개수 설정(50개씩)
        //ReadOnlyCollection<IWebElement> select_boxs = this.driver.FindElements(By.ClassName("select_box"));
        //IWebElement select_box = select_boxs[6];

        //this.driver.FindElements(By.ClassName("select_list"))[7].Click();

        // EUC-KR로 인코딩 후 URL 인코딩
        extract_id_list = new List<string>();

        // Encoding을 등록하려면 먼저 CodePagesEncodingProvider를 추가합니다.
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        /*// 로그인 후 세션 쿠키를 추출
        var cookies = this.driver.Manage().Cookies.AllCookies;

        // 쿠키 가져오기
        var cookieDict = new Dictionary<string, string>();

        // HttpClient 세션 생성
        HttpClientHandler handler = new HttpClientHandler();
        foreach (var kvp in cookieDict)
        {
            handler.CookieContainer.Add(new Uri("https://apis.naver.com"), new System.Net.Cookie(kvp.Key, kvp.Value));
        }

        using (HttpClient client = new HttpClient(handler))
        {
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62");
            foreach (string keyword in extract_keywords)
            {
                string encodedKeyword = HttpUtility.UrlEncode(System.Text.Encoding.GetEncoding("EUC-KR").GetBytes(keyword));

                IWebElement element = null;

                for (int i = start_page; i <= end_page; i++)
                {
                    // ID저장 리스트
                    List<string> id_list = new List<string>();

                    // URL 생성
                    string baseUrl = this.target_url;
                    string searchUrl = $"{baseUrl}?iframe_url=/ArticleSearchList.nhn%3Fsearch.clubid=%26search.searchdate={start_date_str}{end_date_str}%26search.searchBy=0%26search.query={encodedKeyword}%26search.defaultValue=1%26search.includeAll=%26search.exclude=%26search.include=%26search.exact=%26search.sortBy={order_type}%26userDisplay=50%26search.media=0%26search.option=0%26search.page={i}";

                    Console.WriteLine("Encoded URL: " + searchUrl);
                    this.driver.Navigate().GoToUrl(searchUrl);

                    // 카페 ID 추출
                    string target_clubid = this.driver.FindElement(By.Id("front-cafe")).FindElement(By.TagName("a")).GetAttribute("href").Split('=')[1];

                    // 아이디 추출 (제외키워드가 포함되어 있으면 pass)'
                    // 프레임 변경
                    this.driver.SwitchTo().Frame(this.driver.FindElement(By.Id("cafe_main")));

                    await Task.Delay(1000);
                    try
                    {
                        var thread = await Task.Run(() =>
                        {
                            return driver.FindElement(By.ClassName("nodata"));
                        });

                        if (thread.Text.Equals("등록된 게시글이 없습니다."))
                        {
                            Console.WriteLine("더이상 데이터가 없습니다.");
                            return;
                        }
                    }
                    catch (NoSuchElementException ex)
                    {
                        // pass
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine(ex);
                    }

                    // 해당 닉네임 추출
                    try
                    {
                        ReadOnlyCollection<IWebElement> nickname_list = this.driver.FindElements(By.ClassName("p-nick"));
                        foreach (IWebElement nickname in nickname_list)
                        {
                            // MemberKey 알아오기
                            string onclick_text = nickname.FindElement(By.TagName("a")).GetAttribute("onclick");

                            // 작은따옴표를 기준으로 문자열을 분할
                            string[] parts = onclick_text.Split(',');

                            // 두 번째 작은따옴표에 있는 값 출력 (배열 인덱스 1)
                            string memberToken = "";
                            if (parts.Length > 1)
                            {
                                memberToken = parts[1].Replace("'", "").Trim();
                                Console.WriteLine(memberToken); // 출력: x3AMIODs1DNnd2RAW_p4iw
                                AddLog("멤버토큰 : " + memberToken);
                                await Task.Delay(1000);
                            }

                        // https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/10050146/comment-articles?count=30&targetMemberKey=yLHPXHpE 로 요청하기
                            try
                            {
                                // 요청 보내기
                                HttpResponseMessage response = await client.GetAsync($"https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/{target_clubid}/comment-articles?count=30&targetMemberKey={memberToken}");

                                // 요청이 성공적으로 완료됐는지 확인
                                response.EnsureSuccessStatusCode();

                                // 응답의 바디를 JSON 형식으로 읽기
                                string responseBody = await response.Content.ReadAsStringAsync();
                                AddLog("responsebody " + responseBody);
                                Console.WriteLine(responseBody);

                                // JSON 파싱
                                JObject data = JObject.Parse(responseBody);
                                // articleList의 개수를 확인
                                JArray articleList = (JArray)data["result"]["articleList"];

                                if (articleList != null && articleList.Count > 0)
                                {
                                    Console.WriteLine("articleList의 개수가 1개 이상입니다.");
                                    string contentHtml = articleList[0]["writerId"].ToString();
                                    AddLog("해당 아이디 : " + contentHtml);
                                }
                                else
                                {
                                    Console.WriteLine("articleList의 개수가 없습니다.");
                                }
                            }
                            catch (Exception ex)
                            {
                                // pass
                            }

                            string nickname_str = nickname.Text;
                            Console.WriteLine(nickname_str);

                            // 추출된 아이디 리스트에 추가
                            this.extract_nickname_list.Add(nickname_str);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine(ex);
                    }

                    // 해당 아이디 추출
                    try
                    {
                        List<int> except_keyword_index = new List<int>();

                        // 게시글 내용 추출 후 제외 키워드가 포함되어 있다면, 해당 인덱스는 제거
                        ReadOnlyCollection<IWebElement> articles = this.driver.FindElements(By.ClassName("article"));
                        foreach (IWebElement article in articles)
                        {
                            foreach (string except_keyword in except_keywords)
                            {
                                if (article.Text.Contains(except_keyword))
                                {
                                    // 제외 키워드가 포함되어 있다면 해당 인덱스 저장
                                    except_keyword_index.Add(articles.IndexOf(article));
                                }
                            }
                        }
                        *//*
                                            IJavaScriptExecutor jsExecutor = (IJavaScriptExecutor)this.driver;
                                            string script = @"
                                                var newArr = [];
                                                for (let i = 0; i < arrArticle.length; i++) {
                                                    if (arrArticle[i] !== undefined) {
                                                        if (newArr.includes(arrArticle[i]['writerid'])){
                                                            continue;
                                                        }
                                                        else{
                                                            newArr.push(arrArticle[i]['writerid']);   
                                                        }
                                                    }
                                                }
                                                return newArr;
                                                ";

                                            // Execute the JavaScript and get the result as a ReadOnlyCollection<object>
                                            var articleList = (ReadOnlyCollection<object>)jsExecutor.ExecuteScript(script);*//*

                        // Convert the ReadOnlyCollection to a list of strings
                        List<string> articleList_str = id_list.Select(x => x.ToString()).ToList();

                        // 제외 키워드가 포함된 글 인덱스 번호는 제거
                        foreach (int index in except_keyword_index)
                        {
                            articleList_str.RemoveAt(index);
                        }

                        // Print each writer ID
                        foreach (string writerId in articleList_str)
                        {
                            this.extract_id_list.Add(writerId);
                        }


                        AddLog($"{i} 페이지 아이디 추출 성공");

                        // 아이디 리스트에 추가
                        string article_str = "";
                        List<string> article_list = new List<string>();
                        foreach (string article in articleList_str)
                        {
                            article_str = article.Replace("[", "").Replace("]", "").Replace("\"", "").Replace("\'", "");
                            article_list.Append(article_str);
                        }
                    }
                    catch (Exception ex)
                    {
                        AddLog("아이디 추출 중 오류가 발생하였습니다. 해당 현상이 계속된다면 고객센터에 문의해주세요.\n" + ex.Message);
                        Console.WriteLine(ex);
                    }

                }
            }
        }*/
        // ID저장 리스트
        List<string> id_list = new List<string>();

        // 쿠키 추출 및 HttpClient에 적용하기
        using (HttpClientHandler handler = new HttpClientHandler())
        {
            // 쿠키 컨테이너 생성
            handler.CookieContainer = new CookieContainer();

            // WebDriver에서 쿠키 가져오기
            var cookies = this.driver.Manage().Cookies.AllCookies;
            foreach (var cookie in cookies)
            {
                // 쿠키를 HttpClientHandler에 추가
                handler.CookieContainer.Add(new Uri("https://apis.naver.com"), new System.Net.Cookie(cookie.Name, cookie.Value));
            }

            // HttpClient 생성 및 사용자 에이전트 설정
            using (HttpClient client = new HttpClient(handler))
            {
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62");

                // 키워드 검색 및 데이터 처리
                foreach (string keyword in extract_keywords)
                {
                    string encodedKeyword = HttpUtility.UrlEncode(System.Text.Encoding.GetEncoding("EUC-KR").GetBytes(keyword));

                    IWebElement element = null;

                    for (int i = start_page; i <= end_page; i++)
                    {
                        // URL 생성
                        string baseUrl = this.target_url;
                        string searchUrl = $"{baseUrl}?iframe_url=/ArticleSearchList.nhn%3Fsearch.clubid=%26search.searchdate={start_date_str}{end_date_str}%26search.searchBy=0%26search.query={encodedKeyword}%26search.defaultValue=1%26search.includeAll=%26search.exclude=%26search.include=%26search.exact=%26search.sortBy={order_type}%26userDisplay=50%26search.media=0%26search.option=0%26search.page={i}";

                        Console.WriteLine("Encoded URL: " + searchUrl);
                        this.driver.Navigate().GoToUrl(searchUrl);

                        // 카페 ID 추출
                        string target_clubid = this.driver.FindElement(By.Id("front-cafe")).FindElement(By.TagName("a")).GetAttribute("href").Split('=')[1];

                        // 프레임 변경
                        this.driver.SwitchTo().Frame(this.driver.FindElement(By.Id("cafe_main")));

                        await Task.Delay(500);
                        try
                        {
                            var thread = await Task.Run(() =>
                            {
                                return driver.FindElement(By.ClassName("nodata"));
                            });

                            if (thread.Text.Equals("등록된 게시글이 없습니다."))
                            {
                                Console.WriteLine("더이상 데이터가 없습니다.");
                                return;
                            }
                        }
                        catch (NoSuchElementException)
                        {
                            // pass
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine(ex);
                        }

                        // 닉네임 추출
                        try
                        {
                            ReadOnlyCollection<IWebElement> nickname_list = this.driver.FindElements(By.ClassName("p-nick"));
                            foreach (IWebElement nickname in nickname_list)
                            {
                                // MemberKey 추출
                                string onclick_text = nickname.FindElement(By.TagName("a")).GetAttribute("onclick");
                                string[] parts = onclick_text.Split(',');

                                string memberToken = "";
                                if (parts.Length > 1)
                                {
                                    memberToken = parts[1].Replace("'", "").Trim();
                                    Console.WriteLine(memberToken);
                                    AddLog("멤버토큰 : " + memberToken);
/*                                    await Task.Delay(300);
*/                                }

                                // 요청 보내기
                                try
                                {
                                    HttpResponseMessage response = await client.GetAsync($"https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/{target_clubid}/comment-articles?count=30&targetMemberKey={memberToken}");

                                    // 요청이 성공했는지 확인
                                    response.EnsureSuccessStatusCode();

                                    string responseBody = await response.Content.ReadAsStringAsync();
                                    AddLog("responsebody " + responseBody);
                                    Console.WriteLine(responseBody);

                                    // JSON 파싱 및 articleList의 개수 확인
                                    JObject data = JObject.Parse(responseBody);
                                    JArray articleList = (JArray)data["result"]["articleList"];

                                    if (articleList != null && articleList.Count > 0)
                                    {
                                        string contentHtml = articleList[0]["writerId"].ToString();
                                        this.extract_id_list.Add(contentHtml);

                                        LogTextBox.Clear();
                                        AddLog("현재 아이디 추출 개수 : " + extract_id_list.Count);

                                        string nickname_str = nickname.Text;
                                        this.extract_nickname_list.Add(nickname_str);
                                    }
                                    else
                                    {
                                        Console.WriteLine("articleList의 개수가 없습니다.");
                                    }
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine("요청 오류: " + ex.Message);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine(ex);
                        }

                        // 아이디 추출 로직 (필요시 여기에 추가)
                    }
                }
            }
        }

        AddLog($"추출된 아이디 리스트 : {this.extract_id_list.Count}개");
        /*AddLog($"추출된 아이디 리스트 : {this.extract_id_list.Count}개");*/
    }

    // DB 데이터 추출 함수
    private async void Extract_db_btn_Click(object sender, EventArgs e)
    {
        // DB정보 추출 시작
        await Task.WhenAll(Request_DB_data());
    }

    private async Task Request_DB_data()
    {
        try
        {
            // 프레임 설정
            /*this.driver.SwitchTo().DefaultContent();*/

            List<string> proxies = new List<string>()
        {
            "43.200.77.128:3128",
            "3.37.125.76:3128",
            "43.201.121.81:80"
        };

            List<string> userAgents = new List<string>()
        {
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Linux; Android 11; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
        };

            Random random = new Random();

            int proxy_index = 0;
            int id_count = 0;

            /*// 추출된 아이디 리스트 체크
            if (this.extract_id_list.Count == 0)
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "추출된 아이디가 없습니다. 추출 후 다시 시도해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
            }*/

            int id_index = 0;
            List<string> links = new List<string>();
            int page_index = 1;

            // 쿠키 추출 및 HttpClient에 적용하기
            HttpClientHandler handler = new HttpClientHandler();
            handler.CookieContainer = new CookieContainer();

            // WebDriver에서 쿠키 가져오기
            var cookies = this.driver.Manage().Cookies.AllCookies;
            foreach (var cookie in cookies)
            {
                handler.CookieContainer.Add(new Uri("https://apis.naver.com"), new System.Net.Cookie(cookie.Name, cookie.Value));
            }

            // HttpClient 생성 및 사용자 에이전트 설정
            HttpClient client = new HttpClient(handler);
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62");

            // 제외 키워드 리스트
            List<string> except_keywords = except_keyword_list;

            // 관련도 및 최신순 설정 불러오기
            string order_type = "";

            switch (this.selectdOption1)
            {
                case "sim":
                    order_type = "sim";
                    break;
                case "date":
                    order_type = "date";
                    break;
                default:
                    order_type = "sim";
                    break;
            }

            Console.WriteLine($"정렬 기준 : {order_type}");

            // 기간 설정 불러오기
            start_date_str = DateDisplay.Text ?? DateTime.Now.ToString("yyyy/MM/dd");
            end_date_str = DateDisplay2.Text ?? DateTime.Now.ToString("yyyy/MM/dd");

            // 2024년 7월 11일 목요일 -> 20240711로 변경
            start_date_str = Change_date(start_date_str);
            end_date_str = Change_date(end_date_str);
            Console.WriteLine($"시작 날짜 : {start_date_str}");
            Console.WriteLine($"종료 날짜 : {end_date_str}");

            // 페이지 설정 불러오기
            int default_start_page = 1;

            // 페이지 설정이 숫자인지 판별
            if (!int.TryParse(this.start_page_input.Text, out default_start_page))
            {
                // 시작 실패 시 메시지박스를 띄웁니다.
                var messageBox = MessageBoxManager.GetMessageBoxStandard("페이지 설정 실패.", "페이지 설정에는 숫자만 입력할 수 있습니다.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                /*AddLog("시작 페이지는 숫자로 입력해주세요.");*/
                return;
            }
            if (!int.TryParse(this.end_page_input.Text, out default_start_page))
            {
                // 시작 실패 시 메시지박스를 띄웁니다.
                var messageBox = MessageBoxManager.GetMessageBoxStandard("페이지 설정 실패.", "페이지 설정에는 숫자만 입력할 수 있습니다.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                /*AddLog("시작 페이지는 숫자로 입력해주세요.");*/
                return;
            }
            int start_page = (int)this.start_page_input.Value;
            int end_page = (int)this.end_page_input.Value;
            Console.WriteLine($"시작 페이지 : {start_page}");
            Console.WriteLine($"종료 페이지 : {end_page}");

            string except_keyword = "";
            string extract_keyword = "";

            // 인코딩 공급자 등록 (Main 메서드 등 초기화 부분에서 한 번 실행)
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

            // 제외 키워드를 공백을 join 하여 검색어 생성
            foreach (string keyword in except_keywords)
            {
                string encodedKeyword = HttpUtility.UrlEncode(System.Text.Encoding.GetEncoding("EUC-KR").GetBytes(keyword));
                except_keyword += encodedKeyword + " ";
            }

            foreach (string keyword in extract_keyword_list)
            {
                string encodedKeyword = HttpUtility.UrlEncode(System.Text.Encoding.GetEncoding("EUC-KR").GetBytes(keyword));
                extract_keyword += encodedKeyword + " ";
            }
            // 카페 ID 추출
            this.driver.Navigate().GoToUrl(this.target_url);

            this.target_clubid = this.driver.FindElement(By.Id("front-cafe")).FindElement(By.TagName("a")).GetAttribute("href").Split('=')[1]; ;

            try
            {
                for (int i = start_page; i <= end_page; i++)
                {
                    try
                    {
                        string encoded_keyword = HttpUtility.UrlEncode(System.Text.Encoding.GetEncoding("EUC-KR").GetBytes("010"));
                        string baseUrl = this.target_url;
                        string searchUrl = $"{baseUrl}?iframe_url=/ArticleSearchList.nhn%3Fsearch.clubid={target_clubid}%26search.searchdate={start_date_str}{end_date_str}%26search.searchBy=2%26search.query={encoded_keyword}%26search.defaultValue=1%26search.includeAll=%26search.exclude={except_keyword}%26search.include={extract_keyword}%26search.exact=%26search.sortBy={order_type}%26userDisplay=50%26search.media=0%26search.option=0%26search.page={i}";

                        this.driver.Navigate().GoToUrl(searchUrl);

                        // 프레임 변경
                        this.driver.SwitchTo().Frame(this.driver.FindElement(By.Id("cafe_main")));

                        ReadOnlyCollection<IWebElement> elements = this.driver.FindElements(By.ClassName("article"));

                        foreach (IWebElement element in elements)
                        {
                            string link = element.GetAttribute("href");
                            links.Add(link);
                        }

                        try
                        {
                            //var thread = await Task.Run(() =>
                            //{
                            //    return driver.FindElement(By.ClassName("nodata"));
                            //});
                            var nodata = driver.FindElement(By.ClassName("nodata"));

                            //if (thread.Text.Equals("등록된 게시글이 없습니다."))
                            //{
                            //Console.WriteLine("더이상 데이터가 없습니다.");
                            //break;
                            //}
                            if (nodata != null)
                            {
                                Console.WriteLine("더 이상 데이터가 없습니다.");
                            }
                        }
                        catch (NoSuchElementException ex)
                        {
                            // pass
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine(ex);

                        }

                        // 닉네임 추출
                        try
                        {
                            ReadOnlyCollection<IWebElement> nickname_list = this.driver.FindElements(By.ClassName("p-nick"));
                            foreach (IWebElement nickname in nickname_list)
                            {
                                // MemberKey 추출
                                string onclick_text = nickname.FindElement(By.TagName("a")).GetAttribute("onclick");
                                string[] parts = onclick_text.Split(',');

                                string memberToken = "";
                                if (parts.Length > 1)
                                {
                                    memberToken = parts[1].Replace("'", "").Trim();
                                    Console.WriteLine(memberToken);
                                    /*                                    await Task.Delay(300);
                                    */
                                }

                                // 요청 보내기
                                try
                                {
                                    HttpResponseMessage response = await client.GetAsync($"https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/{target_clubid}/comment-articles?count=30&targetMemberKey={memberToken}");

                                    // 요청이 성공했는지 확인
                                    response.EnsureSuccessStatusCode();

                                    string responseBody = await response.Content.ReadAsStringAsync();
                                    Console.WriteLine(responseBody);

                                    // JSON 파싱 및 articleList의 개수 확인
                                    JObject data = JObject.Parse(responseBody);
                                    JArray articleList = (JArray)data["result"]["articleList"];

                                    if (articleList != null && articleList.Count > 0)
                                    {
                                        string contentHtml = articleList[0]["writerId"].ToString();
                                        this.extract_id_list.Add(contentHtml);

                                        LogTextBox.Clear();
                                        AddLog("현재 아이디 추출 개수 : " + extract_id_list.Count);

                                        string nickname_str = nickname.Text;
                                        this.extract_nickname_list.Add(nickname_str);
                                    }
                                    else
                                    {
                                        Console.WriteLine("articleList의 개수가 없습니다.");
                                    }
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine("요청 오류: " + ex.Message);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine(ex);
                        }

                        page_index += 1;
                    }
                    catch (Exception ex)
                    {
                        AddLog("다음 페이지가 없습니다.");
                        break;
                    }

                }

                // 쿠키 세션 저장
                SaveCookiesToFile("cookie.txt");

                int link_index = 0;
                foreach (string id in extract_id_list)
                {
                    try
                    {
                        string articleId = "";
                        string pattern = @"articleid=(\d+)";
                        Match match = Regex.Match(links[link_index], pattern);

                        if (match.Success)
                        {
                            articleId = match.Groups[1].Value;
                            Console.WriteLine("articleId : " + articleId);
                        }
                        else
                        {
                            Console.WriteLine("No articleid found.");
                        }


                        var response = await client.GetStringAsync($"https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/{target_clubid}/articles/{articleId}?query=&useCafeId=true&requestFrom=A");
                        JObject data = JObject.Parse(response);
                        string contentHtml = data["result"]["article"]["contentHtml"].ToString();

                        Console.WriteLine(contentHtml);

                        string phonePattern = @"\b(010[-]?\d{4}[-]?\d{4})\b";
                        // 전화번호 패턴
                        /*string phonePattern = @"\b(0[1-9]{1,2}[-\s]?\d{3,4}[-\s]?\d{4})\b|
                                   (공\s?일\s?공[-\s]?\d{3,4}[-\s]?\d{4})|
                                   (공\s?일\s?공[-\s]?[\d\w]{4}[-\s]?[\d\w]{4})|
                                   ([공영둘셋넷다섯여섯일칠팔구영오]+\s?[일이삼사오육칠팔구영오]+[-\s]?\d{3,4}[-\s]?\d{4})";*/

                        // 정규식 매치 수행
                        /*MatchCollection phoneMatches = Regex.Matches(contentHtml, phonePattern, RegexOptions.IgnoreCase);*/
                        string regionPattern = @"\b(서울\s?[가-힣]*|부산\s?[가-힣]*|대구\s?[가-힣]*|인천\s?[가-힣]*|광주\s?[가-힣]*|대전\s?[가-힣]*|울산\s?[가-힣]*|세종\s?[가-힣]*|경기\s?[가-힣]*|강원\s?[가-힣]*|충청북도\s?[가-힣]*|충북\s?[가-힣]*|충청남도\s?[가-힣]*|충남\s?[가-힣]*|전라북도\s?[가-힣]*|전북\s?[가-힣]*|전라남도\s?[가-힣]*|전남\s?[가-힣]*|경상북도\s?[가-힣]*|경북\s?[가-힣]*|경상남도\s?[가-힣]*|경남\s?[가-힣]*|제주특별자치도\s?[가-힣]*|제주\s?[가-힣]*|제주도\s?[가-힣]*|수원\s?[가-힣]*|성남\s?[가-힣]*|안양\s?[가-힣]*|부천\s?[가-힣]*|광명\s?[가-힣]*|평택\s?[가-힣]*|안산\s?[가-힣]*|고양\s?[가-힣]*|과천\s?[가-힣]*|의왕\s?[가-힣]*|구리\s?[가-힣]*|남양주\s?[가-힣]*|오산\s?[가-힣]*|시흥\s?[가-힣]*|군포\s?[가-힣]*|의정부\s?[가-힣]*|파주\s?[가-힣]*|김포\s?[가-힣]*|하남\s?[가-힣]*|여주\s?[가-힣]*|양평\s?[가-힣]*|동두천\s?[가-힣]*|포천\s?[가-힣]*|양주\s?[가-힣]*|연천\s?[가-힣]*|가평\s?[가-힣]*|춘천\s?[가-힣]*|원주\s?[가-힣]*|강릉\s?[가-힣]*|동해\s?[가-힣]*|태백\s?[가-힣]*|속초\s?[가-힣]*|삼척\s?[가-힣]*|홍천\s?[가-힣]*|횡성\s?[가-힣]*|영월\s?[가-힣]*|평창\s?[가-힣]*|정선\s?[가-힣]*|철원\s?[가-힣]*|화천\s?[가-힣]*|양구\s?[가-힣]*|인제\s?[가-힣]*|고성\s?[가-힣]*|양양\s?[가-힣]*|청주\s?[가-힣]*|충주\s?[가-힣]*|제천\s?[가-힣]*|보은\s?[가-힣]*|옥천\s?[가-힣]*|영동\s?[가-힣]*|증평\s?[가-힣]*|진천\s?[가-힣]*|괴산\s?[가-힣]*|음성\s?[가-힣]*|단양\s?[가-힣]*|천안\s?[가-힣]*|공주\s?[가-힣]*|보령\s?[가-힣]*|아산\s?[가-힣]*|서산\s?[가-힣]*|논산\s?[가-힣]*|계룡\s?[가-힣]*|당진\s?[가-힣]*|금산\s?[가-힣]*|연기\s?[가-힣]*|부여\s?[가-힣]*|서천\s?[가-힣]*|청양\s?[가-힣]*|홍성\s?[가-힣]*|예산\s?[가-힣]*|태안\s?[가-힣]*|전주\s?[가-힣]*|군산\s?[가-힣]*|익산\s?[가-힣]*|정읍\s?[가-힣]*|남원\s?[가-힣]*|김제\s?[가-힣]*|완주\s?[가-힣]*|진안\s?[가-힣]*|무주\s?[가-힣]*|장수\s?[가-힣]*|임실\s?[가-힣]*|순창\s?[가-힣]*|고창\s?[가-힣]*|부안\s?[가-힣]*|목포\s?[가-힣]*|여수\s?[가-힣]*|순천\s?[가-힣]*|나주\s?[가-힣]*|광양\s?[가-힣]*|담양\s?[가-힣]*|곡성\s?[가-힣]*|구례\s?[가-힣]*|고흥\s?[가-힣]*|보성\s?[가-힣]*|화순\s?[가-힣]*|장흥\s?[가-힣]*|강진\s?[가-힣]*|해남\s?[가-힣]*|영암\s?[가-힣]*|무안\s?[가-힣]*|함평\s?[가-힣]*|영광\s?[가-힣]*|장성\s?[가-힣]*|완도\s?[가-힣]*|진도\s?[가-힣]*|신안\s?[가-힣]*|포항\s?[가-힣]*|경주\s?[가-힣]*|김천\s?[가-힣]*|안동\s?[가-힣]*|구미\s?[가-힣]*|영주\s?[가-힣]*|영천\s?[가-힣]*|상주\s?[가-힣]*|문경\s?[가-힣]*|경산\s?[가-힣]*|군위\s?[가-힣]*|의성\s?[가-힣]*|청송\s?[가-힣]*|영양\s?[가-힣]*|영덕\s?[가-힣]*|청도\s?[가-힣]*|고령\s?[가-힣]*|성주\s?[가-힣]*|칠곡\s?[가-힣]*|예천\s?[가-힣]*|봉화\s?[가-힣]*|울진\s?[가-힣]*|울릉\s?[가-힣]*|창원\s?[가-힣]*|진주\s?[가-힣]*|통영\s?[가-힣]*|사천\s?[가-힣]*|김해\s?[가-힣]*|밀양\s?[가-힣]*|거제\s?[가-힣]*|양산\s?[가-힣]*|의령\s?[가-힣]*|함안\s?[가-힣]*|창녕\s?[가-힣]*|고성\s?[가-힣]*|남해\s?[가-힣]*|하동\s?[가-힣]*|산청\s?[가-힣]*|함양\s?[가-힣]*|거창\s?[가-힣]*|합천\s?[가-힣]*|제주시\s?[가-힣]*|서귀포시\s?[가-힣]*)\b";

                        MatchCollection phoneMatches = Regex.Matches(contentHtml, phonePattern);
                        MatchCollection regionMatches = Regex.Matches(contentHtml, regionPattern);

                        Console.WriteLine("Extracted Phone Numbers:");
                        string match_str1 = "";
                        string match_str2 = "";
                        foreach (Match match_data in phoneMatches)
                        {
                            Console.WriteLine(match_data.Value);
                            match_str1 = match_data.Value;
                        }

                        Console.WriteLine("\nExtracted Regions:");
                        foreach (Match match_data in regionMatches)
                        {
                            Console.WriteLine(match_data.Value);
                            match_str2 = match_data.Value;
                        }
                        List<string> arr = new List<string>();

                        Console.WriteLine("추출 결과 : " + match_str1, match_str2);

                        arr.Add(this.extract_id_list[id_index]);
                        arr.Add(match_str1);
                        arr.Add(match_str2);

                        if (arr.Count == 0)
                        {
                            Console.WriteLine("추출된 데이터가 없습니다.");
                            AddLog("추출된 데이터가 없습니다.");
                        }
                        else
                        {
                            Console.WriteLine("추출된 데이터가 있습니다.");
                            /*AddLog("추출된 데이터가 있습니다.");*/                           
                            this.extract_db_list.Add(arr);
                            AddLog($"현재 추출된 데이터 : {extract_db_list.Count}");
                            var newData = new DB_data(this.extract_id_list[id_index], match_str1, match_str2);
                            Data_.Add(newData);

                            await Task.Delay(100);
                            // 맨 아래로 스크롤
                            scroll1.ScrollToEnd();
                            /*AddLog($"아이디 : {this.extract_id_list[id_index]}, 전화번호 : {match_str1}, 지역 : {match_str2}");*/
                        }

                        await Task.Delay(150);

                        id_count += 1;
                        id_index += 1;
                        if (id_count > 100)
                        {
                            Console.WriteLine("아이디 정지를 방지하기 위해 아이피 변경을 시작합니다.");
                            AddLog("아이디 정지를 방지하기 위해 아이피 변경을 시작합니다.");

                            // 아이디 50개당 한번씩 IP변경

                            // 현재 Webdriver Url 저장
                            string currentUrl = this.driver.Url;

                            // WebDriver 종료
                            this.driver.Quit();

                            // 새로운 프록시 설정
                            ChromeOptions options = new ChromeOptions();
                            options.AddArgument("--proxy-server=" + proxies[proxy_index]);
                            options.AddArgument("ignore-certificate-errors");

                            Proxy proxy = new Proxy();
                            proxy.Kind = ProxyKind.Manual;
                            proxy.IsAutoDetect = false;
                            proxy.HttpProxy =
                            proxy.SslProxy = proxies[proxy_index];
                            options.Proxy = proxy;

                            ChromeDriverService chromeDriverService = ChromeDriverService.CreateDefaultService();
                            chromeDriverService.HideCommandPromptWindow = true;

                            this.driver = new ChromeDriver(chromeDriverService, options);
                            this.driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);
                            this.driver.Navigate().GoToUrl(currentUrl);

                            await Task.Delay(1000);

                            LoadCookiesFromFile("cookie.txt");

                            // 작업 이어서 수행
                            this.driver.Navigate().Refresh(); // 쿠키가 적용된 상태로 새로고침

                            proxy_index += 1;

                            // 마지막에 도달했을 때, 초기화
                            if (proxy_index == proxies.Count)
                            {
                                proxy_index = 0;
                            }

                            id_count = 0;

                            Console.WriteLine("아이피 변경이 완료되었습니다.");
                        }
                    }
                    catch (Exception ex)
                    {
                        // pass
                    }
                    link_index += 1;
                }
                AddLog("모든 DB 데이터 추출 작업이 완료되었습니다.");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
            }
            finally
            {
                this.driver.Quit();
                client.Dispose();
                handler.Dispose();
            }
        }
        catch (Exception e)
        {
            AddLog("DB 데이터 추출 중 오류가 발생했습니다. 다시 시도해주세요.");
            return;
        }
    }

    private async Task Request_DB_data_by_requests()
    {
        try
        {
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

            var proxies = new List<string>()
        {
            "43.200.77.128:3128",
            "3.37.125.76:3128",
            "43.201.121.81:80"
        };
            var userAgents = new List<string>()
        {
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Linux; Android 11; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"
        };

            var random = new Random();
            int proxyIndex = 0;
            int idCount = 0;
            int idIndex = 0;
            int pageIndex = 1;

            var links = new List<string>();

            // 쿠키 추출 및 HttpClient에 적용하기
            HttpClientHandler handler = new HttpClientHandler();
            handler.CookieContainer = new CookieContainer();

            // WebDriver에서 쿠키 가져오기
            var cookies = this.driver.Manage().Cookies.AllCookies;
            foreach (var cookie in cookies)
            {
                handler.CookieContainer.Add(new Uri("https://apis.naver.com"), new System.Net.Cookie(cookie.Name, cookie.Value));
            }

            // HttpClient 생성 및 사용자 에이전트 설정
            HttpClient client = new HttpClient(handler);
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62");

            string targetUrl = this.target_url;

            // 🛠 clubid 직접 추출
            var clubPageBytes = await client.GetByteArrayAsync(targetUrl);
            string clubPageHtml = Encoding.GetEncoding("EUC-KR").GetString(clubPageBytes);

            var clubDoc = new HtmlAgilityPack.HtmlDocument();
            clubDoc.LoadHtml(clubPageHtml);

            int k = 0;
            var clubIdNode = clubDoc.DocumentNode.SelectSingleNode("//div[@id='front-cafe']//a");
            while (k < 10)
            {
                 clubIdNode = clubDoc.DocumentNode.SelectSingleNode("//div[@id='front-cafe']//a");
                if (clubIdNode == null)
                {
                    AddLog("카페 ID를 찾지 못했습니다.");
                    k += 1;
                    await Task.Delay(100);
                    continue;
                }
                else
                {
                    break;
                }
            }

            if (clubIdNode == null)
            {
                AddLog("카페 ID를 찾기 못했습니다.");
                return;
            }
            
            string clubHref = clubIdNode.GetAttributeValue("href", "");
            string targetClubId = clubHref.Split('=').Last();

            Console.WriteLine($"✅ 추출된 ClubId : {targetClubId}");

            targetUrl = this.target_url.Replace("https://cafe.naver.com", "https://m.cafe.naver.com");

            // 🛠 검색조건 설정
            string startDateStr = Change_date(DateDisplay.Text ?? DateTime.Now.ToString("yyyy/MM/dd"));
            string endDateStr = Change_date(DateDisplay2.Text ?? DateTime.Now.ToString("yyyy/MM/dd"));
            string orderType = selectdOption1 == "date" ? "date" : "sim";

            string exceptKeyword = string.Join("+", except_keyword_list.Select(k => HttpUtility.UrlEncode(Encoding.GetEncoding("EUC-KR").GetBytes(k))));
            string extractKeyword = string.Join("+", extract_keyword_list.Select(k => HttpUtility.UrlEncode(Encoding.GetEncoding("EUC-KR").GetBytes(k))));

            int startPage = (int)this.start_page_input.Value;
            int endPage = (int)this.end_page_input.Value;
            int currentPage = startPage;
            int totalCount = endPage * 50;

            while (true)
            {
                try
                {
                    string encodedKeyword = HttpUtility.UrlEncode(Encoding.GetEncoding("EUC-KR").GetBytes("010"));
                    string searchUrl = $"https://cafe.naver.com/ArticleSearchList.nhn?search.clubid={targetClubId}&search.searchdate={startDateStr}{endDateStr}&search.searchBy=2&search.query={encodedKeyword}&search.defaultValue=1&search.includeAll=&search.exclude={exceptKeyword}&search.include={extractKeyword}&search.exact=&search.sortBy={orderType}&userDisplay=50&search.media=0&search.option=0&search.page={currentPage}";

                    var searchBytes = await client.GetByteArrayAsync(searchUrl);
                    string searchHtml = Encoding.GetEncoding("EUC-KR").GetString(searchBytes);

                    var searchDoc = new HtmlAgilityPack.HtmlDocument();
                    searchDoc.LoadHtml(searchHtml);

                    var articleLinks = searchDoc.DocumentNode.SelectNodes("//a[contains(@class,'article')]");

                    // 게시글 링크가 더이상 없을 경우
                    if (articleLinks == null)
                    {
                        LogTextBox.Clear();
                        AddLog($"📄 {currentPage} 페이지에 게시글 없음. 종료.");
                        break;
                    }

                    var nicknames = searchDoc.DocumentNode.SelectNodes("//td[contains(@class, 'p-nick')]");

                    if (nicknames == null)
                    {
                        continue;
                    }
                    List<string> nicknameList = new List<string>();

                    // 닉네임 추출
                    foreach (var nicknameNode in nicknames)
                    {
                        nicknameList.Add(nicknameNode.InnerText);
                    }

                    // 닉네임 및 게시글 링크 추출(닉네임 중복 시 제거)
                    int link_index = 0;
                    foreach (var linkNode in articleLinks)
                    {
                        string href = linkNode.GetAttributeValue("href", "");
                        string nickname = nicknameList[link_index];

                        if (!string.IsNullOrEmpty(nickname))
                        {
                            // 닉네임이 이미 존재하면 건너뜀
                            if (extract_nickname_list.Contains(nickname))
                            {
                                link_index++;
                                continue;
                            }

                            extract_nickname_list.Add(nickname);
                        }

                        if (!string.IsNullOrEmpty(href))
                        {
                            links.Add("https://cafe.naver.com" + href);
                            LogTextBox.Clear();
                            AddLog($"📄 현재 게시글 추출 개수 : {links.Count} / {totalCount}");
                        }

                        link_index++;
                    }
                    await Task.Delay(150); // 부하 방지

                    // 페이지 수 증가
                    currentPage += 1;

                    // endPage * 50 개 이상 수집 시 종료
                    if (links.Count >= totalCount)
                    {
                        break;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❗ {currentPage} 페이지 로드 에러 : {ex.Message}");
                    continue;
                }
            }

            AddLog($"게시글 링크 수집 작업 완료.");

            // 🛠 본문 긁기
            foreach (var link in links)
            {
                try
                {
                    string articleId = Regex.Match(link, @"articleid=(\d+)").Groups[1].Value;
                    if (string.IsNullOrEmpty(articleId))
                        continue;

                    string articleApiUrl = $"https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/{targetClubId}/articles/{articleId}?query=&useCafeId=true&requestFrom=A";

                    var articleJsonStr = await client.GetStringAsync(articleApiUrl);
                    var articleJson = JObject.Parse(articleJsonStr);

                    string memberToken = articleJson["result"]?["article"]?["writer"]?["memberKey"]?.ToString();

                    HttpResponseMessage response = await client.GetAsync($"https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/{targetClubId}/comment-articles?count=30&targetMemberKey={memberToken}");

                    // 요청이 성공했는지 확인
                    response.EnsureSuccessStatusCode();

                    string responseBody = await response.Content.ReadAsStringAsync();
                    Console.WriteLine(responseBody);

                    // JSON 파싱 및 articleList의 개수 확인
                    JObject data = JObject.Parse(responseBody);
                    JArray articleList = (JArray)data["result"]["articleList"];

                    if (articleList != null && articleList.Count > 0)
                    {
                        string contentHtml2 = articleList[0]["writerId"].ToString();
                        this.extract_id_list.Add(contentHtml2);
                    }
                    else
                    {
                        this.extract_id_list.Add("");
                    }

                    string contentHtml = articleJson["result"]?["article"]?["contentHtml"]?.ToString();
                    if (string.IsNullOrEmpty(contentHtml))
                        continue;

                    string phonePattern = @"\b(010[-]?\d{4}[-]?\d{4})\b";
                    //string phonePattern = @"\b(0[1-9]{1,2}[-\s]?\d{3,4}[-\s]?\d{4})\b|
                    //               (공\s?일\s?공[-\s]?\d{3,4}[-\s]?\d{4})|
                    //               (공\s?일\s?공[-\s]?[\d\w]{4}[-\s]?[\d\w]{4})|
                    //               ([공영둘셋넷다섯여섯일칠팔구영오]+\s?[일이삼사오육칠팔구영오]+[-\s]?\d{3,4}[-\s]?\d{4})";
                    string regionPattern = @"\b(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\b";

                    string phone = Regex.Match(contentHtml, phonePattern).Value;
                    string region = Regex.Match(contentHtml, regionPattern).Value;

                    //if (string.IsNullOrEmpty(phone))
                    //{
                    //    continue;
                    //}

                    // 📌 중복 검사
                    bool alreadyExists = extract_db_list.Any(x => x.Count > 1 && x[1] == phone);
                    if (!alreadyExists)
                    {
                        // 📌 새 데이터 추가
                        var arr = new List<string> { extract_id_list[idIndex], phone, region };
                        extract_db_list.Add(arr);

                        var newData = new DB_data(extract_id_list[idIndex], phone, region);
                        Data_.Add(newData);

                        // 📌 로그 출력
                        LogTextBox.Clear();
                        AddLog($"✅ DB 추출 완료 개수: {extract_db_list.Count} 개");

                        idIndex++;
                        await Task.Delay(150);
                        continue;
                        
                    }

                    await Task.Delay(100);

                    //if (idIndex > 0 && idIndex % 100 == 0)
                    //{
                    //    proxyIndex = (proxyIndex + 1) % proxies.Count;
                    //    var newHandler = new HttpClientHandler();
                    //    newHandler.Proxy = new WebProxy(proxies[proxyIndex]);
                    //    newHandler.CookieContainer = new CookieContainer();
                    //    foreach (var cookie in cookies)
                    //        newHandler.CookieContainer.Add(new Uri("https://cafe.naver.com"), new System.Net.Cookie(cookie.Name, cookie.Value));

                    //    client.Dispose();
                    //    client = new HttpClient(newHandler);
                    //    client.DefaultRequestHeaders.Add("User-Agent", userAgents[random.Next(userAgents.Count)]);

                    //    Console.WriteLine($"🔄 프록시 교체됨: {proxies[proxyIndex]}");
                    //}

                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❗ 링크 처리 중 에러: {ex.Message}");
                }
            }

            AddLog("DB 데이터 수집 완료");

        }
        catch (Exception ex)
        {
            AddLog($"전체 프로세스 오류 발생: {ex.Message}");
        }
    }



    // 쿠키를 파일에 저장하는 메서드
    public void SaveCookiesToFile(string filePath)
    {
        var cookies = this.driver.Manage().Cookies.AllCookies;

        using (StreamWriter sw = new StreamWriter(filePath))
        {
            foreach (var cookie in cookies)
            {
                sw.WriteLine($"{cookie.Name};{cookie.Value};{cookie.Domain};{cookie.Path};{cookie.Expiry?.ToString("o")};{cookie.Secure}");
            }
        }
    }

    // 파일에서 쿠키를 불러와 WebDriver에 적용하는 메서드
    public void LoadCookiesFromFile(string filePath)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"쿠키 파일을 찾을 수 없습니다: {filePath}");
        }

        using (StreamReader sr = new StreamReader(filePath))
        {
            try
            {
                string line;
                while ((line = sr.ReadLine()) != null)
                {
                    var cookieParts = line.Split(';');

                    // 쿠키 필수 요소 확인 및 파싱
                    if (cookieParts.Length >= 6)
                    {
                        string name = cookieParts[0];
                        string value = cookieParts[1];
                        string domain = cookieParts[2];
                        string path = cookieParts[3];
                        DateTime? expiry = string.IsNullOrEmpty(cookieParts[4]) ? (DateTime?)null : DateTime.Parse(cookieParts[4]);
                        bool isSecure = bool.Parse(cookieParts[5]);

                        // HttpOnly와 SameSite 속성 처리 (옵션)
                        bool isHttpOnly = cookieParts.Length > 6 ? bool.Parse(cookieParts[6]) : false;
                        string sameSite = cookieParts.Length > 7 ? cookieParts[7] : null;

                        // Selenium 쿠키 객체 생성
                        var cookie = new OpenQA.Selenium.Cookie(
                            name,
                            value,
                            domain,
                            path,
                            expiry,
                            isSecure,
                            isHttpOnly,
                            sameSite
                        );

                        // WebDriver에 쿠키 추가
                        this.driver.Manage().Cookies.AddCookie(cookie);
                    }
                    else
                    {
                        Console.WriteLine($"쿠키 데이터가 부족합니다: {line}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"쿠키를 로드하는 동안 오류가 발생했습니다: {ex.Message}");
            }
        }
    }

    // target URL 설정
    private async void Setting_target_url(object sender, RoutedEventArgs e)
    {
        this.target_url = this.cafe_url_input.Text ?? string.Empty;

        if (string.IsNullOrWhiteSpace(target_url))
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "카페 주소 입력란이 비어있습니다. 입력 후 다시 시도해주세요..", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
        }
        else
        {
            this.target_url = this.target_url.Trim();    // 공백제거
            AddLog($"{this.target_url_type} URL 주소가 설정되었습니다. : {this.target_url}");
        }
    }

    // 날짜 데이터 형식 수정
    private string Change_date(string date_string)
    {
        // 입력 텍스트
        string inputText = date_string;

        // 정규 표현식을 사용하여 날짜 부분 추출
        string pattern = @"(\d{4})년\s(\d{1,2})월\s(\d{1,2})일";
        Match match = Regex.Match(inputText, pattern);

        if (match.Success)
        {
            // 년, 월, 일을 정수로 추출
            int year = int.Parse(match.Groups[1].Value);
            int month = int.Parse(match.Groups[2].Value);
            int day = int.Parse(match.Groups[3].Value);

            // DateTime 객체 생성
            DateTime date = new DateTime(year, month, day);

            // 원하는 형식으로 변환
            string formattedDate = date.ToString("yyyyMMdd");

            Console.WriteLine($"변환 날짜 : {formattedDate}"); // 출력: 20240711

            return formattedDate;
        }
        else
        {
            Console.WriteLine("날짜 형식을 인식하지 못했습니다.");
            return "";
        }
    }


    private async void Extract_file_select(object sender, RoutedEventArgs e)
    {
        // 파일 선택 대화상자 생성
        var fileDialog = new OpenFileDialog
        {
            AllowMultiple = false,
            Filters = new List<FileDialogFilter>
            {
                new FileDialogFilter { Name = "텍스트 파일", Extensions = { "txt" } }
            }
        };

        // 파일 선택 다이얼로그 표시
        var result = await fileDialog.ShowAsync(this);
        if (result != null && result.Any())
        {
            this.extract_filePath = result.First();
            string fileName = Path.GetFileName(this.extract_filePath);

            Console.WriteLine($"\n선택한 추출 키워드 텍스트 파일 경로 및 파일명 : {this.extract_filePath}");
            AddLog($"선택한 추출 키워드 텍스트 파일명 : {fileName}");
        }

        // 파일 경로가 설정되었을 때 리스트박스에 키워드를 추가
        if (!string.IsNullOrEmpty(this.extract_filePath))
        {
            // 리스트박스 초기화
            this.extract_keyword_list.Clear();

            // 리스트박스에 키워드 삽입
            try
            {
                using (StreamReader sr = new StreamReader(extract_filePath))
                {
                    string line;
                    while ((line = sr.ReadLine()) != null)
                    {
                        if (!string.IsNullOrWhiteSpace(line))
                        {
                            line = line.Trim();     // 공백 제거
                            this.extract_keyword_list.Add(line);   // ObservableCollection에 아이템 추가
                        }
                    }
                }

                // TextBox에 키워드 개수 표시
                this.extract_keyword_file.Text = "추출 키워드 파일 (" + this.extract_keyword_list.Count + "개) 설정 완료.";
            }
            catch (Exception ex)
            {
                Console.WriteLine("파일을 읽는 동안 오류가 발생했습니다." + ex.Message);
                AddLog("파일을 읽는 동안 오류가 발생했습니다.");
            }
        }
    }

    private async void Except_file_select(object sender, RoutedEventArgs e)
    {
        // 파일 선택 대화상자 생성
        var fileDialog = new OpenFileDialog
        {
            AllowMultiple = false,
            Filters = new List<FileDialogFilter>
            {
                new FileDialogFilter { Name = "텍스트 파일", Extensions = { "txt" } }
            }
        };

        // 파일 선택 다이얼로그 표시
        var result = await fileDialog.ShowAsync(this);
        if (result != null && result.Any())
        {
            this.except_filePath = result.First();
            string fileName = Path.GetFileName(this.except_filePath);

            Console.WriteLine($"\n선택한 제외 키워드 텍스트 파일 경로 및 파일명 : {this.except_filePath}");
            AddLog($"선택한 제외 키워드 텍스트 파일명 : {fileName}");
        }

        // 파일 경로가 설정되었을 때 리스트박스에 키워드를 추가
        if (!string.IsNullOrEmpty(this.except_filePath))
        {
            // 리스트박스 초기화
            except_keyword_list.Clear();

            // 리스트박스에 키워드 삽입
            try
            {
                using (StreamReader sr = new StreamReader(this.except_filePath))
                {
                    string line;
                    while ((line = sr.ReadLine()) != null)
                    {
                        if (!string.IsNullOrWhiteSpace(line))
                        {
                            line = line.Trim();     // 공백 제거
                            except_keyword_list.Add(line);   // ObservableCollection에 아이템 추가
                        }
                    }
                }

                // TextBox에 키워드 개수 표시
                this.except_keyword_file.Text = "제외 키워드 파일 (" + except_keyword_list.Count + "개) 설정 완료.";
            }
            catch (Exception ex)
            {
                Console.WriteLine("파일을 읽는 동안 오류가 발생했습니다." + ex.Message);
                AddLog("파일을 읽는 동안 오류가 발생했습니다.");
            }
        }
    }

    public class InputData
    {
        public string ID { get; set; }
        public string PW { get; set; }
        public List<string> ExtractKeywords { get; set; }
        public List<string> ExceptKeywords { get; set; }
        public string SelectedSortOption { get; set; }
        public string SelectedDateOption { get; set; }
        public string StartDate { get; set; }
        public string EndDate { get; set; }
        public string StartPage { get; set; }
        public string EndPage { get; set; }
        public string SelectedSaveOption { get; set; }
        /*public string SelectedTimerOption { get; set; }*/
        public string TargetURL { get; set; }
    }

    // 정렬 설정 라디오 버튼 이벤트 핸들러
    private void RadioButton_Checked1(object? sender, EventArgs e)
    {
        if (sender is RadioButton radioButton)
        {
            // 선택된 라디오 버튼의 Name 속성을 저장합니다.
            this.selectdOption1 = radioButton.Name;

            Console.WriteLine($"Selected Option: {this.selectdOption1}");
        }
    }

    // 기간 설정 라디오 버튼 이벤트 핸들러
    private void RadioButton_Checked2(object? sender, EventArgs e)
    {
        if (sender is RadioButton radioButton)
        {
            // 기간 설정 라디오 버튼 클릭시 날짜 선택 컨트롤 활성화
            if (radioButton.Name.Equals("etc"))
            {
                DateDisplay.IsEnabled = true;
                DateDisplay2.IsEnabled = true;
            }
            else
            {
                // 전체 선택 시, 날짜 텍스트 없애기
                if (radioButton.Name.Equals("All"))
                {
                    DateDisplay.Text = "";
                    DateDisplay2.Text = "";
                }
                else if(radioButton.Name.Equals("day"))
                {
                    DateDisplay.Text = DateTime.Now.AddDays(-1).ToString("yyyy-MM-dd");
                    DateDisplay2.Text = DateTime.Now.ToString("yyyy-MM-dd");
                }
                else if (radioButton.Name.Equals("week"))
                {
                    DateDisplay.Text = DateTime.Now.AddDays(-7).ToString("yyyy-MM-dd");
                    DateDisplay2.Text = DateTime.Now.ToString("yyyy-MM-dd");
                }
                else if (radioButton.Name.Equals("year"))
                {
                    DateDisplay.Text = DateTime.Now.AddDays(-365).ToString("yyyy-MM-dd");
                    DateDisplay2.Text = DateTime.Now.ToString("yyyy-MM-dd");
                }
                DateDisplay.IsEnabled = false;
                DateDisplay2.IsEnabled = false;
            }

            // 선택된 라디오 버튼의 Name 속성을 저장합니다.
            this.selectdOption2 = radioButton.Name;
            Console.WriteLine($"Selected Option: {this.selectdOption2}");
        }
    }

    // 저장 설정 라디오 버튼 이벤트 핸들러
    private void RadioButton_Checked3(object? sender, EventArgs e)
    {
        if (sender is RadioButton radioButton)
        {
            // 선택된 라디오 버튼의 Name 속성을 저장합니다.
            this.selectdOption3 = radioButton.Name;
            Console.WriteLine($"Selected Option: {this.selectdOption3}");
        }
    }

    // 입력란 내용 저장
    private async void Save_data(object sender, RoutedEventArgs e)
    {
        // 입력란 내용으로 입력폼 생성
        var data = new InputData
        {
            ID = this.Id_input.Text ?? string.Empty,
            PW = this.Pw_input.Text ?? string.Empty,
            ExtractKeywords = this.extract_keyword_list,
            ExceptKeywords = this.except_keyword_list,
            SelectedSortOption = this.selectdOption1,
            SelectedDateOption = this.selectdOption2,
            StartDate = this.DateDisplay.Text ?? string.Empty,
            EndDate = this.DateDisplay2.Text ?? string.Empty,
            StartPage = this.start_page_input.Text ?? string.Empty,
            EndPage = this.end_page_input.Text ?? string.Empty,
            SelectedSaveOption = this.selectdOption3,
            /*SelectedTimerOption = this.timer_input.SelectedItem is ComboBoxItem selectedItem ? selectedItem.Content.ToString() : string.Empty,*/
            TargetURL = this.cafe_url_input.Text ?? string.Empty
        };

        // JSON 형식으로 저장
        await save_data_to_json(data);
    }

    // JSON 파일 저장 함수
    private async Task save_data_to_json(InputData data)
    {
        try
        {
            // 폴더 선택
            var folderDialog = new OpenFolderDialog();
            var folderPath = await folderDialog.ShowAsync(this);

            if (string.IsNullOrWhiteSpace(folderPath))
            {
                Console.WriteLine("폴더 선택이 취소되었습니다.");
                return;
            }

            Console.WriteLine($"선택한 폴더 경로: {folderPath}");

            // JSON 직렬화
            string json = JsonConvert.SerializeObject(data, Formatting.Indented);

            // 파일 경로 생성
            string fileName = $"{this.api_key}.json";
            string fullPath = Path.Combine(folderPath, fileName);

            // 파일 저장
            File.WriteAllText(fullPath, json);
            AddLog("입력 내용이 성공적으로 저장되었습니다.");
        }
        catch (Exception ex)
        {
            Console.WriteLine("입력 내용 저장 도중 에러가 발생하였습니다: " + ex.Message);
            AddLog("입력 내용 저장 도중 에러가 발생하였습니다.");
        }
    }


    // 저장 데이터를 불러오는 함수
    private void load_data_from_json()
    {
        try
        {

            // API 키를 활용하여 서버에서 파일 불러오기


            string path = $"{api_key}.json";
            string json = File.ReadAllText(path);
            InputData data = JsonConvert.DeserializeObject<InputData>(json);

            if (data == null)
            {
                AddLog("불러올 데이터가 존재하지 않습니다.");
                return;
            }

            // 입력란 초기화
            this.Id_input.Text = data.ID ?? string.Empty;
            this.Pw_input.Text = data.PW ?? string.Empty;
            this.extract_keyword_list = data.ExtractKeywords;
            this.except_keyword_list = data.ExceptKeywords;
            this.extract_keyword_file.Text = "추출 키워드 파일 (" + data.ExtractKeywords.Count + "개) 설정 완료.";
            this.except_keyword_file.Text = "제외 키워드 파일 (" + data.ExceptKeywords.Count + "개) 설정 완료.";
            /*this.extract_keyword_list.Items.Clear();
            this.except_keyword_list.Items.Clear();*/
            /*this.extract_keyword_list.Items.AddRange(data.ExtractKeywords.ToArray());
            this.except_keyword_list.Items.AddRange(data.ExceptKeywords.ToArray());*/
            this.DateDisplay.Text = data.StartDate;
            this.DateDisplay2.Text = data.EndDate;
            this.start_page_input.Text = data.StartPage;
            this.end_page_input.Text = data.EndPage;
            this.cafe_url_input.Text = data.TargetURL;

            // 정렬 옵션 설정
            switch (data.SelectedSortOption)
            {
                case "관련도순":
                    sim.IsChecked = true;
                    RadioButton_Checked1(sim, new EventArgs());
                    break;
                case "최신순":
                    date.IsChecked = true;
                    RadioButton_Checked1(date, new EventArgs());
                    break;
                default:
                    // 기본값 설정 (모두 체크 해제)
                    sim.IsChecked = true;
                    date.IsChecked = false;
                    RadioButton_Checked1(sim, new EventArgs());
                    break;
            }

            // 기간 옵션 설정
            switch (data.SelectedDateOption)
            {
                case "전체":
                    All.IsChecked = true;
                    start_date_str = "";
                    end_date_str = "";
                    RadioButton_Checked2(All, new EventArgs());
                    break;
                case "1일":
                    day.IsChecked = true;
                    start_date_str = DateTime.Now.AddDays(-1).ToString("yyyy-MM-dd");
                    end_date_str = DateTime.Now.ToString("yyyy-MM-dd");
                    RadioButton_Checked2(day, new EventArgs());
                    break;
                case "1주":
                    week.IsChecked = true;
                    start_date_str = DateTime.Now.AddDays(-7).ToString("yyyy-MM-dd");
                    end_date_str = DateTime.Now.ToString("yyyy-MM-dd");
                    RadioButton_Checked2(week, new EventArgs());
                    break;
                case "1년":
                    year.IsChecked = true;
                    start_date_str = DateTime.Now.AddYears(-1).ToString("yyyy-MM-dd");
                    end_date_str = DateTime.Now.ToString("yyyy-MM-dd");
                    RadioButton_Checked2(year, new EventArgs());
                    break;
                case "기타":
                    etc.IsChecked = true;
                    // 직접 설정한 날짜로 설정
                    DateDisplay.Text = DateTime.Now.ToString("yyyy-MM-dd");
                    DateDisplay2.Text = DateTime.Now.ToString("yyyy-MM-dd");
                    RadioButton_Checked2(etc, new EventArgs());
                    break;
                default:
                    // 기본값 설정 (모두 체크 해제)
                    All.IsChecked = true;
                    day.IsChecked = false;
                    week.IsChecked = false;
                    year.IsChecked = false;
                    etc.IsChecked = false;
                    start_date_str = "";
                    end_date_str = "";
                    RadioButton_Checked2(All, new EventArgs());
                    break;
            }

           /* // 저장 방식 설정
            switch (data.SelectedSaveOption)
            {
                case "수동 저장":
                    Manual.IsChecked = true;
                    RadioButton_Checked3(Manual, new EventArgs());
                    break;
                case "자동 저장":
                    Auto.IsChecked = true;
                    RadioButton_Checked3(Auto, new EventArgs());
                    break;
                default:
                    // 기본값 설정 (모두 체크 해제)
                    Auto.IsChecked = true;
                    Manual.IsChecked = false;
                    RadioButton_Checked3(Auto, new EventArgs());
                    break;
            }*/

            // 저장 타이머 설정
            // JSON 데이터의 selectedTime 값을 ComboBox에서 찾고 선택합니다.
            /*foreach (ComboBoxItem item in timer_input.Items)
            {
                if (item.Content.ToString() == data.SelectedTimerOption)
                {
                    timer_input.SelectedItem = item;
                    break;
                }
            }*/

            // 타겟 URL 설정
            this.target_url = data.TargetURL;

            AddLog("데이터를 불러오는데 성공하였습니다.");
        }
        catch (Exception ex)
        {
            Console.WriteLine("입력 내용 불러오기 도중 에러가 발생하였습니다." + ex.Message);
            AddLog("입력 내용 불러오기 도중 에러가 발생하였습니다.");
        }
    }

    // 입력란 초기화
    private void Reset_data(object sender, RoutedEventArgs e)
    {
        this.extract_keyword_list.Clear();
        this.except_keyword_list.Clear();
        this.extract_id_list.Clear();
        this.extract_filePath = "";
        this.except_filePath = "";
        this.target_url = "";
        this.target_url_type = "";     // 카페 or 게시판 주소인지 체크
        this.is_login_success = false;
        this.start_date_str = "";
        this.end_date_str = "";
        this.extract_db_list.Clear();
        this.extract_nickname_list.Clear();

        // DB정보 추출 비활성화
        /*this.extract_db_btn.Enabled = false;*/

        // 관련도순 라디오버튼 체크
        sim.IsChecked = true;
        date.IsChecked = false;
        RadioButton_Checked1(sim, new EventArgs());

        // 기간(전체) 설정
        All.IsChecked = true;
        day.IsChecked = false;
        week.IsChecked = false;
        year.IsChecked = false;
        etc.IsChecked = false;
        RadioButton_Checked2(All, new EventArgs());

        // 페이지 설정 초기화
        this.start_page_input.Text = "1";
        this.end_page_input.Text = "5";

/*        // 저장 방식 초기화
        Auto.IsChecked = true;
        Manual.IsChecked = false;
        RadioButton_Checked3(Auto, new EventArgs());*/

        // 타겟 URL 설정 초기화
        this.cafe_url_input.Clear();

        // 로그 초기화
        this.LogTextBox.Clear();

        // 날짜설정 초기화
        this.DateDisplay.Clear();
        this.DateDisplay2.Clear();

        // 추출, 제외 키워드 내용 초기화
        this.extract_keyword_file.Clear();
        this.except_keyword_file.Clear();

        // 저장 타이머 초기화
        /*this.timer_input.Clear();*/

        // 작업 내역 초기화
        /*this.MyDataGrid.ItemsSource.Clear();*/

        // 아이디, 비밀번호 초기화
        this.Id_input.Clear();
        this.Pw_input.Clear();

        // 카페 주소 입력란 초기화
        this.cafe_url_input.Clear();
    }

    private async void SaveExcelThread(object sender, RoutedEventArgs e)
    {
        await Task.WhenAll(SaveExcelFileAsync());
    }

    public async Task SaveExcelFileAsync()
    {
        // 폴더 선택 다이얼로그 생성
        var folderDialog = new OpenFolderDialog
        {
            Title = "엑셀 파일을 저장할 폴더를 선택해주세요."
        };

        // 폴더 선택 다이얼로그 표시
        string folderPath = await folderDialog.ShowAsync(this);

        if (!string.IsNullOrEmpty(folderPath))
        {
            try
            {
                // 파일 이름 생성
                string fileName = $"저장데이터_{DateTime.Now.ToString("yyyy-MM-dd-HH-mm-ss")}.xlsx";
                string filePath = Path.Combine(folderPath, fileName);

                // ExcelPackage를 사용하여 엑셀 파일 생성
                using (ExcelPackage package = new ExcelPackage())
                {
                    // 추출된 데이터
                    List<List<string>> extracted_data = this.extract_db_list;

                    // 시트 생성
                    ExcelWorksheet worksheet = package.Workbook.Worksheets.Add("Sheet1");

                    // 데이터 삽입
                    int index = 0;
                    foreach (List<string> extracted_data_ in this.extract_db_list)
                    {
                        worksheet.Cells[1 + index, 1].Value = extracted_data_[0];
                        worksheet.Cells[1 + index, 2].Value = extracted_data_[1];
                        worksheet.Cells[1 + index, 3].Value = extracted_data_[2];

                        index += 1;
                    }

                    // 엑셀 파일 저장
                    package.SaveAs(new FileInfo(filePath));
                    AddLog("추출 데이터 저장이 성공적으로 마무리 되었습니다.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("파일을 저장하는 동안 오류가 발생했습니다: " + ex.Message);
                AddLog("파일을 저장하는 동안 오류가 발생했습니다.");
            }
        }
        else
        {
            AddLog("폴더 선택이 취소되었습니다.");
        }
    }
}