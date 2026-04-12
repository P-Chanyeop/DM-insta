using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Markup.Xaml;
using System.Diagnostics;
using System;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using System.Collections.ObjectModel;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using HtmlAgilityPack;
using System.Threading;
using System.IO;
using System.Linq;
using MsBox.Avalonia.Enums;
using MsBox.Avalonia;

namespace NaverBandNew;

public partial class NaverBand : Window
{
    bool is_login_success = false;
    string api_key = "";
    ChromeDriver driver;
    private List<string> targetUrls = new List<string>();
    private List<string> targetNames = new List<string>();

    private List<string> selectedImages = new();

    public ObservableCollection<DB_data> Data_ { get; }
    public class DB_data
    {
        public string 밴드명 { get; set; }
        public string 주소 { get; set; }
        public string 작업상태 { get; set; }

        public DB_data(string bandName, string bandUrl, string status)
        {
            this.밴드명 = bandName;
            this.주소 = bandUrl;
            this.작업상태 = status;
        }
    }

    public NaverBand() {
        InitializeComponent();
    }

    public NaverBand(string apiKey, string responseText)
    {
        InitializeComponent();
        this.api_key = apiKey;

        var jsonDoc = JsonDocument.Parse(responseText);
        string nickname = jsonDoc.RootElement.GetProperty("name").GetString();
        int remainDays = jsonDoc.RootElement.GetProperty("remainingDays").GetInt32();

        NICKNAME.Text = nickname;
        SUB_REMAIN_TEXT.Text = remainDays >= 30 ? (remainDays / 30) + "개월" : remainDays + "일";

        var data_ = new List<DB_data>();
        Data_ = new ObservableCollection<DB_data>(data_);
        DataContext = this;

        this.CanResize = false;

        LoadSettings();
        AddLog("프로그램이 정상적으로 실행되었습니다.");
    }
    

    private void TextBox_GotFocus(object? sender, GotFocusEventArgs e) =>
        SetTextboxColor(sender, "#1E1E1E", "#1E1E1E");

    private void TextBox_LostFocus(object? sender, RoutedEventArgs e) =>
        SetTextboxColor(sender, "#1E1E1E", "#FFFFFF");

    private void SetTextboxColor(object? sender, string bgColor, string fgColor)
    {
        if (sender is TextBox textBox)
        {
            textBox.Background = Avalonia.Media.Brush.Parse(bgColor);
            textBox.Foreground = Avalonia.Media.Brush.Parse(fgColor);
        }
    }

    private void Manage_MyPage(object sender, RoutedEventArgs e) =>
        OpenUrl("https://softcat.co.kr/mypage");

    private void Manage_QnA(object sender, RoutedEventArgs e) =>
        OpenUrl("https://softcat.co.kr/mypage/subscription");

    private void OpenUrl(string url) =>
        Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });

    private void Logout(object sender, RoutedEventArgs e)
    {
        if (this.is_login_success)
        {
            this.driver.Quit();
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

    public async void AddLog(string message)
    {
        LogTextBox.Text += DateTime.Now + " " + message + "\n";
        LogTextBox.CaretIndex = LogTextBox.Text.Length;
    }

    /* 사진 선택 시 수행 함수 */
    private async void select_pictures(object? sender, RoutedEventArgs e)
    {
        // 이미 선택된 사진 초기화
        selectedImages = [];
        
        // 사진 여러개 선택가능 (최대 100개)
        // 이미지 파일 선택
        var dialog = new OpenFileDialog();
        dialog.AllowMultiple = true;
        dialog.Filters.Add(new FileDialogFilter() { Name = "Images", Extensions = { "jpg", "png", "bmp" } });
        var result = await dialog.ShowAsync(this);

        if (result != null)
        {
            var files = result.Select(x => x);
            foreach (var file in files)
            {
                string fileName = file.Split("\\").Last();
                string filePath = file.Replace("\\", "/");

                selectedImages.Add(filePath);
            }

            if (selectedImages.Count > 100)
            {
                selectedImages = [];
                var messageBox = MessageBoxManager.GetMessageBoxStandard("사진 선택 오류", "사진은 최대 100개까지 선택 가능합니다. 다시 시도해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                return;
            }

            // 선택된 파일 개수 출력
            AddLog($"사진을 {selectedImages.Count}개 선택하였습니다.");
        }
    }

    /* 옵션 및 내용 불러오는 함수 */
    public List<string> LoadOptions()
    {
        try
        {
            var startDelay = ((NumericUpDown)this.FindControl<NumericUpDown>("START_SECOND")).Value;
            var endDelay = ((NumericUpDown)this.FindControl<NumericUpDown>("END_SECOND")).Value;
            var content = ((TextBox)this.FindControl<TextBox>("CONTENT")).Text;
            if (string.IsNullOrEmpty(content))
            {
                AddLog("내용을 입력해주세요.");
                return null;
            }
            if (startDelay > endDelay)
            {
                AddLog("시작 지연시간이 종료 지연시간보다 클 수 없습니다.");
                return null;
            }
            AddLog($"시작 지연시간: {startDelay}초, 종료 지연시간: {endDelay}초.");

            AddLog($"작성할 내용 로드 완료.");

            // 설정한 옵션 List에 저장
            List<string> options = new List<string>();
            options.Add(startDelay.ToString());
            options.Add(endDelay.ToString());
            options.Add(content);

            return options;
        }
        catch (Exception ex)
        {
            AddLog("[오류] 옵션 불러오기 실패: " + ex.Message);
            return null;
        }
    }

    private async void StartMacro(object sender, RoutedEventArgs e)
    {
        AddLog("네이버 번드 로그인 페이지로 이동합니다. 수동 로그인 이후, 인증과정을 수행해주세요.");
        await Task.WhenAll(LoginNaver());
    }

    private async Task LoginNaver()
    {
        try
        {
            if (this.is_login_success)
            {
                AddLog("이미 로그인 되어있습니다. 작업을 바로 시작합니다.");
            }


            if (driver == null)
            {
                // ChromeDriver 경로 설정 (환경 변수에 추가했으면 생략 가능)
                var chromeDriverService = ChromeDriverService.CreateDefaultService();
                // 프롬프트 창 숨기기
                chromeDriverService.HideCommandPromptWindow = true;

                var chromeOptions = new ChromeOptions();
                /*chromeOptions.AddArgument("--headless");*/
                chromeOptions.AddArgument("--disable-gpu");


                // ChromeDriver 인스턴스 생성
                this.driver = new ChromeDriver(chromeDriverService, chromeOptions);
                this.driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);
            }
            
            this.driver.Navigate().GoToUrl("https://auth.band.us/login_page?next_url=https%3A%2F%2Fband.us%2Fhome%3Freferrer%3Dhttps%253A%252F%252Fband.us%252F");

            while (true)
            {
                try
                {
                    this.driver.FindElement(By.CssSelector("#container > div.tabMenuHomeLayout > div > div > div.cGlobalTabs._lnbMenus > a._tabMyBandList.tab.-active"));
                    break;
                }
                catch { continue; }
            }

            await Task.Delay(1500);

            AddLog("로그인 성공. 밴드 목록 수집중...");

            string src = this.driver.PageSource;
            var htmlDoc = new HtmlDocument();
            htmlDoc.LoadHtml(src);

            var ul = htmlDoc.DocumentNode.SelectSingleNode("//ul[@data-viewname='DBandCollectionView']");
            var lis = ul.SelectNodes(".//li");

            if (lis != null)
            {
                foreach (var li in lis)
                {
                    try
                    {
                        var inner = li.SelectSingleNode(".//div[@class='bandInner']");
                        var a = inner.SelectSingleNode(".//a");

                        if (a.GetAttributeValue("class", "").Contains("_adBandCover") ||
                            a.GetAttributeValue("href", "").Contains("create"))
                        {
                            continue;
                        }

                        string bandUrl = a.GetAttributeValue("href", "");
                        var div = a.SelectSingleNode(".//div[@class='bandName']");
                        string bandName = div.SelectSingleNode(".//p").InnerText.Trim();

                        targetNames.Add(bandName);
                        targetUrls.Add($"https://band.us{bandUrl}");
                    }
                    catch { }
                }
                await SetDataGrid();
            }

            this.is_login_success = true;
            AddLog("밴드 목록 수집완료. 작성을 수행합니다.");

            // 설정한 옵션 불러오기
            var options = LoadOptions();
            var startDelay = Convert.ToInt32(options[0]);
            var endDelay = Convert.ToInt32(options[1]);
            var content = options[2];

            if (options == null)
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("옵션 로드 오류", "옵션을 불러오는데 실패하였습니다. 다시 시도해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                return;
            }

            if (targetUrls.Count == 0)
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("밴드 목록 로드 오류", "수집된 밴드 목록이 없습니다. 한개 이상 가입되어 있는 지 확인해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                return;
            }

            // 작업 시작
            string 작업횟수 = this.WRITE_COUNT.Text;
            if (string.IsNullOrEmpty(작업횟수))
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("작업횟수 오류", "작업횟수를 입력해주세요.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                return;
            }

            var count = Convert.ToInt32(작업횟수);

            for (int i = 0; i < count; i++)
            {
                int index = 0;
                foreach (var bandUrl in targetUrls)
                {
                    Data_[index].작업상태 = "작업중";
                    MyDataGrid.ItemsSource = null;
                    MyDataGrid.ItemsSource = Data_;
                    try
                    {
                        AddLog($"[{bandUrl}] 글 작성중...");
                        var writePostTask = NaverBandUtil.WritePost(driver, bandUrl, content, selectedImages, AddLog);

                        await writePostTask;

                        // 마지막 작업이면 break
                        if (i == count - 1 && index == targetUrls.Count - 1)
                        {
                            break;
                        }

                        // 작성후 랜덤 지연시
                        Random random = new Random();
                        int delay = random.Next(startDelay * 1000, endDelay * 1000);
                        AddLog($"[{bandUrl}] {delay / 1000}초 대기중...");

                        for (int j = 0; j < delay / 1000; j++)
                        {
                            await Task.Delay(1000);
                            AddLog($"[{bandUrl}] {delay / 1000 - j}초 남음...");
                        }

                        index++;

                        // 남은 횟수 표시
                        Data_[index].작업상태 = $"{count - i}회 남음";
                        MyDataGrid.ItemsSource = null;
                        MyDataGrid.ItemsSource = Data_;
                    }
                    catch (Exception ex)
                    {
                        AddLog($"[{bandUrl}] 글 작성 중 오류 발생: {ex.Message}");
                    }
                }
            }

            for (int i = 0; i < targetUrls.Count; i++)
            {
                Data_[i].작업상태 = "작업 완료";
                MyDataGrid.ItemsSource = null;
                MyDataGrid.ItemsSource = Data_;
            }

            AddLog("모든 작업이 완료되었습니다.");
        }
        catch (Exception e)
        {
            AddLog("작업 중 오류가 발생했습니다.");
            AddLog(e.Message);
        }
    }

    private async Task SetDataGrid()
    {
        Data_.Clear();

        for (int i = 0; i < targetUrls.Count; i++)
        {
            Data_.Add(new DB_data(targetNames[i], targetUrls[i], "작업대기"));
        }
        MyDataGrid.ItemsSource = null;
        MyDataGrid.ItemsSource = Data_;
    }

    private void SaveSettings(object sender, RoutedEventArgs e)
    {
        try
        {
            var settingObj = new
            {
                DelayStart = ((NumericUpDown)this.FindControl<NumericUpDown>("START_SECOND")).Value,
                DelayEnd = ((NumericUpDown)this.FindControl<NumericUpDown>("END_SECOND")).Value,
                Content = ((TextBox)this.FindControl<TextBox>("글작성내용TextBox")).Text,
            };
            var json = JsonSerializer.Serialize(settingObj);
            File.WriteAllText("settings.json", json);
            AddLog("설정이 저장되었습니다.");
        }
        catch (Exception ex)
        {
            AddLog("[오류] 설정 저장 실패: " + ex.Message);
        }
    }

    private void LoadSettings()
    {
        try
        {
            if (!File.Exists("settings.json")) return;
            var json = File.ReadAllText("settings.json");
            var doc = JsonDocument.Parse(json);
            ((NumericUpDown)this.FindControl<NumericUpDown>("START_SECOND")).Value = (decimal?)doc.RootElement.GetProperty("DelayStart").GetDouble();
            ((NumericUpDown)this.FindControl<NumericUpDown>("END_SECOND")).Value = (decimal?)doc.RootElement.GetProperty("DelayEnd").GetDouble();
            ((TextBox)this.FindControl<TextBox>("글작성내용TextBox")).Text = doc.RootElement.GetProperty("Content").GetString();
            AddLog("저장된 설정을 로드했습니다.");
        }
        catch (Exception ex)
        {
            AddLog("[오류] 설정 불러오기 실패: " + ex.Message);
        }
    }
}
