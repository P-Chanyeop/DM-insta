/*
 * 네이버DB 추출기
 * 프로그램의 메인 폼
 * 
 * 최종 작성자 : 박찬엽
 * 최종 작성일 : 2024.07.11
 * 최종수정일 : 2024.08.31
 */
using System.Windows.Forms;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using System;
using System.Data;
using System.IO;
using System.Linq;
using System.Net;
using System.Web;
using OfficeOpenXml;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Numerics;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Text.RegularExpressions;
using Newtonsoft.Json;
using System.Net.Http;
using System.Collections.ObjectModel;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;


namespace WindowsFormsApp1
{

    public partial class Form1 : Form
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

        ChromeDriver driver;

        public CookieContainer Cookie { get; private set; }

        public Form1()
        {
            InitializeComponent();
            InitializePlaceholder();

            // 프로그램 리사이즈 불가 설정
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;

            // 타겟 URL 주소 초기화
            this.target_url = "";

            // DB정보 추출시작 버튼 비활성화 
            extract_db_btn.Enabled = false;

            LogMessage("프로그램이 실행되었습니다.");

            // 키입력 이벤트 설정
            // extract_keyword_input의 KeyDown 이벤트를 연결합니다.
            extract_keyword_input.KeyDown += new KeyEventHandler(Extract_keyword_input_KeyDown);
            except_keyword_input.KeyDown += new KeyEventHandler(Except_keyword_input_KeyDown);

            // extract_keyword_list의 MouseDoubleClick 이벤트를 연결합니다.
            extract_keyword_list.MouseDoubleClick += new MouseEventHandler(Delete_extract_keywords);
            except_keyword_list.MouseDoubleClick += new MouseEventHandler(Delete_except_keywords);

            // 엑셀 저장을 위한 EPPlus 라이브러리 초기화
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

            // 저장 데이터가 존재하면 불러오기
            if (File.Exists("input_data.json"))
            {
                load_data_from_json();
            }
        }

        // 로그인 버튼 클릭 이벤트
        private async void button1_Click(object sender, EventArgs e)
        {
            // 로그인 메서드 비동기 호출
            await Task.WhenAll(Login_naver());
        }

        public string decodeEuckrUrl(string url)
        {
            System.Text.Encoding euckr = System.Text.Encoding.GetEncoding(51949);
            byte[] euckrBytes = System.Web.HttpUtility.UrlDecodeToBytes(url);
            return euckr.GetString(euckrBytes);
        }

        private async Task Login_naver()
        {
            try
            {
                // ChromeDriver 경로 설정 (환경 변수에 추가했으면 생략 가능)
                var chromeDriverService = ChromeDriverService.CreateDefaultService();
                // 프롬프트 창 숨기기
                chromeDriverService.HideCommandPromptWindow = true;

                var chromeOptions = new ChromeOptions();
                //chromeOptions.AddArgument("--headless");

                // ChromeDriver 인스턴스 생성
                this.driver = new ChromeDriver(chromeDriverService, chromeOptions);
                this.driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);

                // 네이버 로그인 수행
                string ID = id_input.Text;
                string PW = pw_input.Text;

                LogMessage("로그인에 성공하였습니다.");
                this.is_login_success = true;

                this.driver.Navigate().GoToUrl("https://nid.naver.com/nidlogin.login");

                Clipboard.SetText(ID);

                await Task.Delay(500);

                this.driver.FindElement(By.Id("id")).SendKeys(OpenQA.Selenium.Keys.Control + 'v');

                Clipboard.SetText(PW);

                await Task.Delay(500);

                this.driver.FindElement(By.Id("pw")).SendKeys(OpenQA.Selenium.Keys.Control + 'v');
                this.driver.FindElement(By.Id("pw")).SendKeys(OpenQA.Selenium.Keys.Enter);
            }
            catch (Exception ex)
            {
                Console.WriteLine("로그인 중 에러발생. 해당 현상이 계속 발생 시, 개발자에게 문의해주세요." + ex.Message);
                LogMessage("로그인 실패. 해당 현상이 계속 발생 시, 개발자에게 문의해주세요.");

                this.driver.Quit();
            }
        }


        private async void extract_id_thread(object sender, EventArgs e)
        {
            // DB정보 추출 시작
            await Task.WhenAll(Get_id_list());
        }

        // 대상 아이디 추출
        private async Task Get_id_list()
        {
            // 로그인이 안되어 있을 시, 로그인을 먼저 수행하도록 메세지 출력
            if (!is_login_success)
            {
                MessageBox.Show("로그인이 되어있지 않습니다. 로그인 후 다시 시도해주세요.");
                return;
            }

            // 타겟주소가 설정되어 있지 않을 시, 설정하도록 메세지 출력
            if (string.IsNullOrWhiteSpace(target_url))
            {
                MessageBox.Show("타겟 URL 주소가 설정되어 있지 않습니다. 설정 후 다시 시도해주세요.");
                return;
            }

            // 추출 키워드 리스트
            string[] extract_keywords = extract_keyword_list.Items.Cast<string>().ToArray();

            if (extract_keywords.Length == 0)
            {
                MessageBox.Show("추출 키워드가 설정되어 있지 않습니다. 최소 1개 설정 후 다시 시도해주세요.");
                return;
            }

            // DB 추출 버튼 활성화
            this.extract_db_btn.Enabled = true;

            // 제외 키워드 리스트
            string[] except_keywords = except_keyword_list.Items.Cast<string>().ToArray();

            // 관련도 및 최신순 설정 불러오기
            string order_type = "";

            foreach (Control control in option_panel_1.Controls)
            {
                if (control is RadioButton radioButton && radioButton.Checked)
                {
                    switch (radioButton.Text)
                    {
                        case "관련도순":
                            order_type = "sim";
                            break;
                        case "최신순":
                            order_type = "date";
                            break;
                        default:
                            break;
                    }
                }
            }
            Console.WriteLine($"정렬 기준 : {order_type}");

            // 기간 설정 불러오기
            start_date_str = start_date.Text;
            end_date_str = end_date.Text;

            // 2024년 7월 11일 목요일 -> 20240711로 변경
            start_date_str = Change_date(start_date_str);
            end_date_str = Change_date(end_date_str);
            Console.WriteLine($"시작 날짜 : {start_date_str}");
            Console.WriteLine($"종료 날짜 : {end_date_str}");

            // 페이지 설정 불러오기
            int start_page = (int)this.start_page.Value;
            int end_page = (int)this.end_page.Value;
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
                        var articleList = (ReadOnlyCollection<object>)jsExecutor.ExecuteScript(script);

                        // Convert the ReadOnlyCollection to a list of strings
                        List<string> articleList_str = articleList.Select(x => x.ToString()).ToList();

                        // Print each writer ID
                        foreach (string writerId in articleList_str)
                        {
                            this.extract_id_list.Add(writerId);


                            // Invoke를 통해 UI 스레드에서 LogMessage 호출
                            this.Invoke(new Action(() =>
                            {
                                // log_text에 아이디 개수 표시
                                this.log_text.ResetText();
                                LogMessage($"추출된 아이디 개수 : {this.extract_id_list.Count}\n");
                            }));
                        }


                        Console.WriteLine($"{i} 페이지 아이디 추출 성공");

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
                        Console.WriteLine(ex);
                    }
                    
                }
            }
          
            Console.WriteLine($"추출된 아이디 리스트 : {this.extract_id_list.Count}개");
            /*LogMessage($"추출된 아이디 리스트 : {this.extract_id_list.Count}개");*/
        }

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
                return null;
            }
        }

        // 기간 설정 라디오버튼 클릭 이벤트
        private void Date_radio_button_click(object sender, EventArgs e)
        {
            foreach (Control control in option_panel_2.Controls)
            {
                if (control is RadioButton radioButton && radioButton.Checked)
                {
                    switch (radioButton.Text)
                    {
                        case "전체":
                            start_date_str = "";
                            end_date_str = "";
                            
                            // 날짜 설정 비활성화
                            start_date.Enabled = false;
                            end_date.Enabled = false;
                            break;
                        case "1일":
                            // 어제 날짜 ~ 오늘 날짜로 설정
                            start_date_str = DateTime.Now.AddDays(-1).ToString("yyyy-MM-dd");
                            end_date_str = DateTime.Now.ToString("yyyy-MM-dd");

                            // 날짜 설정 비활성화
                            start_date.Enabled = false;
                            end_date.Enabled = false;
                            break;
                        case "1주":
                            // 7일 전 날짜 ~ 오늘 날짜로 설정
                            start_date_str = DateTime.Now.AddDays(-7).ToString("yyyy-MM-dd");
                            end_date_str = DateTime.Now.ToString("yyyy-MM-dd");

                            // 날짜 설정 비활성화
                            start_date.Enabled = false;
                            end_date.Enabled = false;
                            break;
                        case "1년":
                            // 1년 전 날짜 ~ 오늘 날짜로 설정
                            start_date_str = DateTime.Now.AddYears(-1).ToString("yyyy-MM-dd");
                            end_date_str = DateTime.Now.ToString("yyyy-MM-dd");

                            // 날짜 설정 비활성화
                            start_date.Enabled = false;
                            end_date.Enabled = false;
                            break;
                        case "기타":
                            // 직접 설정한 날짜로 설정
                            start_date.Text = DateTime.Now.ToString("yyyy-MM-dd");
                            end_date.Text = DateTime.Now.ToString("yyyy-MM-dd");

                            // 날짜 설정 활성화
                            start_date.Enabled = true;
                            end_date.Enabled = true;
                            break;
                        default:
                            start_date_str = "";
                            end_date_str = "";
                            break;
                    }

                    // 날짜 설정
                    start_date.Text = start_date_str;
                    end_date.Text = end_date_str;
                }
            }
        }

        // 저장버튼 기능
        private async void Save_extracted_data(object sender, EventArgs e)
        {

            bool is_auto_save = false;
            string interval_str = timeBox.Text;

            while (true)
            {
                foreach (Control control in option_panel_3.Controls)
                {
                    if (control is RadioButton radioButton && radioButton.Checked)
                    {
                        if (radioButton.Text == "자동 저장")
                        {
                            // 자동 저장인 경우
                            // 자동 저장 설정
                            is_auto_save = true;
                        }
                        else
                        {
                            // 수동 저장인 경우
                            // 수동 저장 설정
                            is_auto_save = false;
                        }
                    }
                }

                if (int.TryParse(interval_str, out int interval) && is_auto_save)
                {
                    // 대기시간동안 대기
                    interval_str = interval_str.Replace("시간", "").Trim();
                    Console.WriteLine($"대기시간 : {interval_str}시간");
                    LogMessage("저장 타이머 시간 간격 : " + interval_str + "시간");

                    // 비동기 대기
                    //await Task.Delay(1000 * 60 * interval);
                    await Task.Delay(1000 * 10 * interval);
                }
                else if(!is_auto_save)
                {
                    // 수동 저장인 경우 pass
                }
                else
                {
                    Console.WriteLine("대기시간을 잘못 입력하였습니다.");
                    LogMessage("대기시간을 잘못 입력하였습니다.");
                    return;
                }

                if (is_auto_save)
                {
                    // 자동 저장인 경우 프로그램과 동일 경로에 엑셀 파일로 저장
                    string fileName = $"자동저장데이터{DateTime.Now.ToString("yyyy-MM-dd")}.xlsx";

                    if (this.extract_id_list == null)
                    {
                        // MessageBox.Show("추출된 데이터가 없습니다. 추출 후 다시 시도해주세요.");
                        // await Task.Delay(1000 * 10);
                        continue;
                    }
                    try
                    {
                        using (ExcelPackage package = new ExcelPackage())
                        {
                            // 추출된 데이터
                            List<List<string>> extracted_data = this.extract_db_list;

                            // 시트 생성
                            ExcelWorksheet worksheet = package.Workbook.Worksheets.Add("Sheet1");

                            // 데이터 삽입
                            int index = 0;
                            foreach (List<string> extracted_data_ in extract_db_list)
                            {
                                worksheet.Cells[1 + index, 1].Value = extracted_data_[0];
                                worksheet.Cells[1 + index, 2].Value = extracted_data_[1];
                                worksheet.Cells[1 + index, 3].Value = extracted_data_[2];

                                index += 1;
                            }

                            // 엑셀 파일 저장
                            package.SaveAs(new FileInfo(fileName));
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("파일을 저장하는 동안 오류가 발생했습니다." + ex.Message);
                        LogMessage("파일을 저장하는 동안 오류가 발생했습니다.");
                    }
                }
                else
                {
                    // 수동 저장인 경우
                    // 수동 저장 설정
                    // 추출된 데이터 저장
                    SaveFileDialog saveFileDialog = new SaveFileDialog();
                    saveFileDialog.Filter = "엑셀 파일 (*.xlsx)|*.xlsx";
                    saveFileDialog.Title = "저장할 파일 경로 및 파일명을 입력해주세요.";
                    saveFileDialog.ShowDialog();

                    if (saveFileDialog.FileName != "")
                    {
                        try
                        {
                            string filePath = saveFileDialog.FileName;

                            using (ExcelPackage package = new ExcelPackage())
                            {
                                // 추출된 데이터
                                List<List<string>> extracted_data = extract_db_list;

                                // 시트 생성
                                ExcelWorksheet worksheet = package.Workbook.Worksheets.Add("Sheet1");

                                // 데이터 삽입
                                int index = 0;
                                foreach (List<string> extracted_data_ in extract_db_list)
                                {
                                    worksheet.Cells[1 + index, 1].Value = extracted_data_[0];
                                    worksheet.Cells[1 + index, 2].Value = extracted_data_[1];
                                    worksheet.Cells[1 + index, 3].Value = extracted_data_[2];

                                    index += 1;
                                }

                                // 엑셀 파일 저장
                                package.SaveAs(new FileInfo(filePath));
                                LogMessage("수동 저장이 성공적으로 마무리 되었습니다.");
                                break;
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine("파일을 저장하는 동안 오류가 발생했습니다." + ex.Message);
                            LogMessage("파일을 저장하는 동안 오류가 발생했습니다.");
                            return;
                        }
                    }
                }
            }
            
        }

        // target URL 설정
        private void Setting_target_url(object sender, EventArgs e)
        {
            this.target_url = target_url_input.Text;

            if (string.IsNullOrWhiteSpace(target_url))
            {
                MessageBox.Show("입력란이 비어있습니다. 입력 후 다시 시도해주세요.");
            }
            else
            {
                // 카페 URL or 게시판 URL 확인
                foreach (Control control in target_url_panel.Controls)
                {
                    if (control is RadioButton radioButton && radioButton.Checked)
                    {
                        if (radioButton.Text == "카페 주소")
                        {
                            // 카페 URL인 경우
                            this.target_url_type = "카페";
                        }
                        else
                        {
                            // 게시판 URL인 경우
                            this.target_url_type = "게시판";
                        }
                    }
                }

                this.target_url = this.target_url.Trim();    // 공백제거
                LogMessage($"{this.target_url_type} URL 주소가 설정되었습니다. : {this.target_url}");
            }
        }
        private void InitializePlaceholder()
        {
            // Placeholder 텍스트
            string extract_placeholder = "입력 후 ENTER";
            string except_placeholder = "입력 후 ENTER";

            // 텍스트박스에 기본 텍스트 설정
            extract_keyword_input.Text = extract_placeholder;
            extract_keyword_input.ForeColor = Color.Gray;

            // 포커스 얻을 때 이벤트 핸들러
            extract_keyword_input.GotFocus += (sender, e) =>
            {
                if (extract_keyword_input.Text == extract_placeholder)
                {
                    extract_keyword_input.Text = "";
                    extract_keyword_input.ForeColor = Color.Black;
                }
            };

            // 포커스 잃을 때 이벤트 핸들러
            extract_keyword_input.LostFocus += (sender, e) =>
            {
                if (string.IsNullOrWhiteSpace(extract_keyword_input.Text))
                {
                    extract_keyword_input.Text = extract_placeholder;
                    extract_keyword_input.ForeColor = Color.Gray;
                }
            };

            // 텍스트박스에 기본 텍스트 설정
            except_keyword_input.Text = except_placeholder;
            except_keyword_input.ForeColor = Color.Gray;

            // 포커스 얻을 때 이벤트 핸들러
            except_keyword_input.GotFocus += (sender, e) =>
            {
                if (except_keyword_input.Text == except_placeholder)
                {
                    except_keyword_input.Text = "";
                    except_keyword_input.ForeColor = Color.Black;
                }
            };

            // 포커스 잃을 때 이벤트 핸들러
            except_keyword_input.LostFocus += (sender, e) =>
            {
                if (string.IsNullOrWhiteSpace(except_keyword_input.Text))
                {
                    except_keyword_input.Text = except_placeholder;
                    except_keyword_input.ForeColor = Color.Gray;
                }
            };
        }

            // 추출 키워드 추가
            private void Add_extract_keywords(object sender, EventArgs e)
        {
            // 입력된 키워드 읽기
            string keyword = extract_keyword_input.Text;

            if (string.IsNullOrWhiteSpace(keyword))
            {
                MessageBox.Show("입력란이 비어있습니다. 입력 후 다시 시도해주세요.");
            }
            else
            {
                keyword = keyword.Trim();    // 공백제거
                extract_keyword_list.Items.Add(keyword);

                extract_keyword_input.Text = "";    // 입력란 초기화
                extract_keyword_input.Focus();  // 입력란으로 포커스
            }
        }

        // KeyDown 이벤트 핸들러 작성
        private void Extract_keyword_input_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == System.Windows.Forms.Keys.Enter)
            {
                // Enter 키가 눌렸을 때 키워드를 리스트박스에 추가
                Add_extract_keywords(sender, e);

                // 키 이벤트가 다른 곳으로 전달되지 않도록 처리
                e.SuppressKeyPress = true;
            }
        }
        private void Delete_extract_keywords(object sender, MouseEventArgs e)
        {
            int selected_item_index = extract_keyword_list.IndexFromPoint(e.Location);

            if (selected_item_index != ListBox.NoMatches)
            {
                try
                {
                    extract_keyword_list.Items.RemoveAt(selected_item_index);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("추출 키워드 삭제 도중 에러가 발생하였습니다." + ex.Message);
                    LogMessage("추출 키워드 삭제 도중 에러가 발생하였습니다.");
                }
            }
        }

        // 제외 키워드 추가
        private void Add_except_keywords(object sender, EventArgs e)
        {
            // 입력된 키워드 읽기
            string keyword = except_keyword_input.Text;

            if (string.IsNullOrWhiteSpace(keyword))
            {
                MessageBox.Show("입력란이 비어있습니다. 입력 후 다시 시도해주세요.");
            }
            else
            {
                keyword = keyword.Trim();    // 공백제거
                except_keyword_list.Items.Add(keyword);

                except_keyword_input.Text = "";    // 입력란 초기화
                except_keyword_input.Focus();   // 입력란으로 포커스
            }
        }

        // KeyDown 이벤트 핸들러 작성
        private void Except_keyword_input_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == System.Windows.Forms.Keys.Enter)
            {
                // Enter 키가 눌렸을 때 키워드를 리스트박스에 추가
                Add_except_keywords(sender, e);

                // 키 이벤트가 다른 곳으로 전달되지 않도록 처리
                e.SuppressKeyPress = true;
            }
        }

        private void Delete_except_keywords(object sender, MouseEventArgs e)
        {
            int selected_item_index = except_keyword_list.IndexFromPoint(e.Location);

            if (selected_item_index != ListBox.NoMatches)
            {
                try
                {
                    except_keyword_list.Items.RemoveAt(selected_item_index);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("추출 키워드 삭제 도중 에러가 발생하였습니다." + ex.Message);
                    LogMessage("추출 키워드 삭제 도중 에러가 발생하였습니다.");
                }
            }
        }

        private void ID_label_Click(object sender, EventArgs e)
        {

        }

        // ID
        private void textBox2_TextChanged(object sender, EventArgs e)
        {

        }

        // PW
        private void textBox1_TextChanged(object sender, EventArgs e)
        {

        }

        // Log
        private void textBox1_TextChanged_1(object sender, EventArgs e)
        {

        }

        private void label2_Click(object sender, EventArgs e)
        {

        }

        // 로그 메세지 
        public void LogMessage(string message)
        {
            if (InvokeRequired)
            {
                Invoke(new Action<string>(LogMessage), message);
                return;
            }
            log_text.AppendText($"{DateTime.Now}: {message}{Environment.NewLine}");
        }

        private void label3_Click(object sender, EventArgs e)
        {

        }

        private void label4_Click(object sender, EventArgs e)
        {

        }

        private void radioButton5_CheckedChanged(object sender, EventArgs e)
        {

        }

        private void label5_Click(object sender, EventArgs e)
        {

        }

        private void label7_Click(object sender, EventArgs e)
        {

        }

        private void comboBox1_SelectedIndexChanged(object sender, EventArgs e)
        {

        }

        private void label8_Click(object sender, EventArgs e)
        {

        }

        private void radioButton11_CheckedChanged(object sender, EventArgs e)
        {

        }

        private void radioButton10_CheckedChanged(object sender, EventArgs e)
        {

        }
        private async void extract_db_btn_Click(object sender, EventArgs e)
        {
            // DB정보 추출 시작
            await Task.WhenAll(Request_DB_data());
        }

        private async Task Request_DB_data()
        {
            // 프레임 설정
            this.driver.SwitchTo().DefaultContent();

            // 카페 ID 추출
            string target_clubid = this.driver.FindElement(By.Id("front-cafe")).FindElement(By.TagName("a")).GetAttribute("href").Split('=')[1];

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

            // 추출된 아이디 리스트 체크 
            if (this.extract_id_list.Count == 0)
            {
                MessageBox.Show("추출된 아이디가 없습니다. 추출 후 다시 시도해주세요.");
            }

            // 메인프레임으로 변경
            this.driver.SwitchTo().Frame(this.driver.FindElement(By.Id("cafe_main")));

            // 해당 아이디 검색 후 DB 데이터 추출
            int id_index = 0;
            foreach (string id in this.extract_nickname_list)
            {
                // 해당 아이디로 검색
                List<string> links = new List<string>();

                int page_index = 1;
                while (true)
                {
                    // 1. 해당 링크 추출 
                    try
                    {
                        // 닉네임 EUC-KR로 인코딩
                        string encoded_nickname = HttpUtility.UrlEncode(System.Text.Encoding.GetEncoding("EUC-KR").GetBytes(id));

                        string baseUrl = this.target_url;
                        string searchUrl = $"{baseUrl}?iframe_url=/ArticleSearchList.nhn%3Fsearch.clubid={target_clubid}%26search.searchdate=%26search.searchBy=3%26search.query={encoded_nickname}%26search.defaultValue=1%26search.includeAll=%26search.exclude=%26search.include=%26search.exact=%26search.sortBy=date%26userDisplay=50%26search.media=0%26search.option=0%26search.page={page_index}";

                        this.driver.Navigate().GoToUrl(searchUrl);
                        await Task.Delay(1000);

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
                                break;
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

                        ReadOnlyCollection<IWebElement> elements = this.driver.FindElements(By.ClassName("article"));
                       
                        foreach (IWebElement element in elements)
                        {
                            string link = element.GetAttribute("href");
                            links.Add(link);
                        }

                        page_index += 1;
                    }
                    catch (Exception ex)
                    {
                        LogMessage("다음 페이지가 없습니다. ");
                        break;
                    }
                }

                Console.WriteLine($"해당링크 {links}");

                // 로그인 후 세션 쿠키를 추출
                var cookies = this.driver.Manage().Cookies.AllCookies;

                // 쿠키 가져오기
                var cookieDict = new Dictionary<string, string>();

                foreach (var cookie in cookies)
                {
                    cookieDict[cookie.Name] = cookie.Value;
                }

                // HttpClient 세션 생성
                HttpClientHandler handler = new HttpClientHandler();
                foreach (var kvp in cookieDict)
                {
                    handler.CookieContainer.Add(new Uri("https://apis.naver.com"), new System.Net.Cookie(kvp.Key, kvp.Value));
                }

                // 쿠키 세션 저장
                SaveCookiesToFile("cookie.txt");

                foreach (string link in links)
                {
                    string articleId = "";
                    // DB정보 저장 임시 array
                    List<string> arr = new List<string>();

                    // articleid 값을 추출하기 위한 정규식 패턴
                    string pattern = @"articleid=(\d+)";

                    // 정규식 매치 수행
                    Match match = Regex.Match(link, pattern);

                    if (match.Success)
                    {
                        articleId = match.Groups[1].Value;
                        Console.WriteLine("articleId : " + articleId);
                    }
                    else
                    {
                        Console.WriteLine("No articleid found.");
                    }

                    using (HttpClient client = new HttpClient(handler))
                    {
                        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62");

                        // 요청 보내기
                        var response = client.GetStringAsync($"https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/31113026/articles/{articleId}?query=&useCafeId=true&requestFrom=A").Result;

                        // JSON 파싱
                        JObject data = JObject.Parse(response);
                        string contentHtml = data["result"]["article"]["contentHtml"].ToString();


                        Console.WriteLine(contentHtml);

                        // 전화번호 패턴: 010-1234-1234 또는 01012341234
                        string phonePattern = @"\b(010[-]?\d{4}[-]?\d{4})\b";

                        // 지역명 패턴: 서울, 경기, 서울 강서구 등 (여기서는 간단하게 서울과 경기를 체크)
                        string regionPattern = @"\b(서울\s?[가-힣]*|부산\s?[가-힣]*|대구\s?[가-힣]*|인천\s?[가-힣]*|광주\s?[가-힣]*|대전\s?[가-힣]*|울산\s?[가-힣]*|세종\s?[가-힣]*|경기\s?[가-힣]*|강원\s?[가-힣]*|충청북도\s?[가-힣]*|충북\s?[가-힣]*|충청남도\s?[가-힣]*|충남\s?[가-힣]*|전라북도\s?[가-힣]*|전북\s?[가-힣]*|전라남도\s?[가-힣]*|전남\s?[가-힣]*|경상북도\s?[가-힣]*|경북\s?[가-힣]*|경상남도\s?[가-힣]*|경남\s?[가-힣]*|제주특별자치도\s?[가-힣]*|제주\s?[가-힣]*|제주도\s?[가-힣]*|수원\s?[가-힣]*|성남\s?[가-힣]*|안양\s?[가-힣]*|부천\s?[가-힣]*|광명\s?[가-힣]*|평택\s?[가-힣]*|안산\s?[가-힣]*|고양\s?[가-힣]*|과천\s?[가-힣]*|의왕\s?[가-힣]*|구리\s?[가-힣]*|남양주\s?[가-힣]*|오산\s?[가-힣]*|시흥\s?[가-힣]*|군포\s?[가-힣]*|의정부\s?[가-힣]*|파주\s?[가-힣]*|김포\s?[가-힣]*|하남\s?[가-힣]*|여주\s?[가-힣]*|양평\s?[가-힣]*|동두천\s?[가-힣]*|포천\s?[가-힣]*|양주\s?[가-힣]*|연천\s?[가-힣]*|가평\s?[가-힣]*|춘천\s?[가-힣]*|원주\s?[가-힣]*|강릉\s?[가-힣]*|동해\s?[가-힣]*|태백\s?[가-힣]*|속초\s?[가-힣]*|삼척\s?[가-힣]*|홍천\s?[가-힣]*|횡성\s?[가-힣]*|영월\s?[가-힣]*|평창\s?[가-힣]*|정선\s?[가-힣]*|철원\s?[가-힣]*|화천\s?[가-힣]*|양구\s?[가-힣]*|인제\s?[가-힣]*|고성\s?[가-힣]*|양양\s?[가-힣]*|청주\s?[가-힣]*|충주\s?[가-힣]*|제천\s?[가-힣]*|보은\s?[가-힣]*|옥천\s?[가-힣]*|영동\s?[가-힣]*|증평\s?[가-힣]*|진천\s?[가-힣]*|괴산\s?[가-힣]*|음성\s?[가-힣]*|단양\s?[가-힣]*|천안\s?[가-힣]*|공주\s?[가-힣]*|보령\s?[가-힣]*|아산\s?[가-힣]*|서산\s?[가-힣]*|논산\s?[가-힣]*|계룡\s?[가-힣]*|당진\s?[가-힣]*|금산\s?[가-힣]*|연기\s?[가-힣]*|부여\s?[가-힣]*|서천\s?[가-힣]*|청양\s?[가-힣]*|홍성\s?[가-힣]*|예산\s?[가-힣]*|태안\s?[가-힣]*|전주\s?[가-힣]*|군산\s?[가-힣]*|익산\s?[가-힣]*|정읍\s?[가-힣]*|남원\s?[가-힣]*|김제\s?[가-힣]*|완주\s?[가-힣]*|진안\s?[가-힣]*|무주\s?[가-힣]*|장수\s?[가-힣]*|임실\s?[가-힣]*|순창\s?[가-힣]*|고창\s?[가-힣]*|부안\s?[가-힣]*|목포\s?[가-힣]*|여수\s?[가-힣]*|순천\s?[가-힣]*|나주\s?[가-힣]*|광양\s?[가-힣]*|담양\s?[가-힣]*|곡성\s?[가-힣]*|구례\s?[가-힣]*|고흥\s?[가-힣]*|보성\s?[가-힣]*|화순\s?[가-힣]*|장흥\s?[가-힣]*|강진\s?[가-힣]*|해남\s?[가-힣]*|영암\s?[가-힣]*|무안\s?[가-힣]*|함평\s?[가-힣]*|영광\s?[가-힣]*|장성\s?[가-힣]*|완도\s?[가-힣]*|진도\s?[가-힣]*|신안\s?[가-힣]*|포항\s?[가-힣]*|경주\s?[가-힣]*|김천\s?[가-힣]*|안동\s?[가-힣]*|구미\s?[가-힣]*|영주\s?[가-힣]*|영천\s?[가-힣]*|상주\s?[가-힣]*|문경\s?[가-힣]*|경산\s?[가-힣]*|군위\s?[가-힣]*|의성\s?[가-힣]*|청송\s?[가-힣]*|영양\s?[가-힣]*|영덕\s?[가-힣]*|청도\s?[가-힣]*|고령\s?[가-힣]*|성주\s?[가-힣]*|칠곡\s?[가-힣]*|예천\s?[가-힣]*|봉화\s?[가-힣]*|울진\s?[가-힣]*|울릉\s?[가-힣]*|창원\s?[가-힣]*|진주\s?[가-힣]*|통영\s?[가-힣]*|사천\s?[가-힣]*|김해\s?[가-힣]*|밀양\s?[가-힣]*|거제\s?[가-힣]*|양산\s?[가-힣]*|의령\s?[가-힣]*|함안\s?[가-힣]*|창녕\s?[가-힣]*|고성\s?[가-힣]*|남해\s?[가-힣]*|하동\s?[가-힣]*|산청\s?[가-힣]*|함양\s?[가-힣]*|거창\s?[가-힣]*|합천\s?[가-힣]*|제주시\s?[가-힣]*|서귀포시\s?[가-힣]*)\b";

                        // 전화번호 추출
                        MatchCollection phoneMatches = Regex.Matches(contentHtml, phonePattern);

                        // 지역명 추출
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
                            match_str1 = match_data.Value;
                        }

                        Console.WriteLine("추출 결과 : " + match_str1.ToString(), match_str2.ToString());
                        arr.Add(this.extract_id_list[id_index]);
                        arr.Add(match_str1);
                        arr.Add(match_str2);

                        if (arr.Count == 0)
                        {
                            Console.WriteLine("추출된 데이터가 없습니다.");
                            LogMessage("추출된 데이터가 없습니다.");
                        }
                        else
                        {
                            Console.WriteLine("추출된 데이터가 있습니다.");
                            LogMessage("추출된 데이터가 있습니다.");

                            // 데이터 저장
                            this.extract_db_list.Add(arr);

                            LogMessage($"아이디 : {this.extract_id_list[id_index]}, 전화번호 : {match_str1}, 지역 : {match_str2}");
                            break;
                        }
                    }
                }
                id_count += 1;

                if (id_count > 0)
                {
                    Console.WriteLine("아이디 정지를 방지하기 위해 아이피 변경을 시작합니다.");
                    LogMessage("아이디 정지를 방지하기 위해 아이피 변경을 시작합니다.");

                    // 아이디 50개당 한번씩 IP변경

                    // 현재 Webdriver Url 저장
                    string currentUrl = this.driver.Url;

                    // WebDriver 종료
                    this.driver.Quit();

                    // 새로운 프록시 설정
                    ChromeOptions options = new ChromeOptions();
                    /*options.AddArgument("--proxy-server=" + proxies[proxy_index]);*/
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

                    // 저장한 쿠키 로드
                    /*foreach (var cookie in cc)
                    {
                        this.driver.Manage().Cookies.AddCookie(cookie);
                    }*/
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



        private void extract_file_select(object sender, EventArgs e)
        {
            OpenFileDialog fileDialog = new OpenFileDialog();
            // fileDialog.Filter = "텍스트 파일 (*.xlsx)|*.txt";
            fileDialog.Filter = "텍스트 파일 (*.txt)|*.txt";
            fileDialog.Multiselect = false;
            if (fileDialog.ShowDialog() == DialogResult.OK)
            {
                this.extract_filePath = fileDialog.FileName;
                string[] listOfPaths = this.extract_filePath.Split('\\');
                string fileName = listOfPaths[listOfPaths.Length - 1];

                Console.WriteLine($"\n선택한 추출 키워드 텍스트 파일 경로 및 파일명 : {this.extract_filePath}");
                LogMessage($"선택한 추출 키워드 텍스트 파일명 : {fileName}");
            }

            if (this.extract_filePath != "")
            {
                // 리스트박스 초기화
                //extract_keyword_list.Items.Clear();

                // 리스트박스에 키워드 삽입
                try
                {
                    using (StreamReader sr = new StreamReader(this.extract_filePath))
                    {
                        string line;
                        while ((line = sr.ReadLine()) != null)
                        {
                            if (!string.IsNullOrWhiteSpace(line))
                            {
                                line = line.Trim();     // 공백제거
                                extract_keyword_list.Items.Add(line);   // 리스트박스에 아이템 추가
                            }
                        }
                    }
                } 
                catch (Exception ex)
                {
                    Console.WriteLine("파일을 읽는 동안 오류가 발생했습니다." + ex.Message);
                    LogMessage("파일을 읽는 동안 오류가 발생했습니다.");
                }
            }
        }

        private void except_file_select(object sender, EventArgs e)
        {
            OpenFileDialog fileDialog = new OpenFileDialog();
            // fileDialog.Filter = "텍스트 파일 (*.xlsx)|*.txt";
            fileDialog.Filter = "텍스트 파일 (*.txt)|*.txt";
            fileDialog.Multiselect = false;
            if (fileDialog.ShowDialog() == DialogResult.OK)
            {
                this.except_filePath = fileDialog.FileName;
                string[] listOfPaths = this.except_filePath.Split('\\');
                string fileName = listOfPaths[listOfPaths.Length - 1];

                Console.WriteLine($"\n선택한 제외 키워드 텍스트 파일 경로 및 파일명 : {this.except_filePath}");
                LogMessage($"선택한 제외 키워드 텍스트 파일명 : {fileName}");
            }

            if (this.except_filePath != "")
            {
                // 리스트박스 초기화
                //except_keyword_list.Items.Clear();

                // 리스트박스에 키워드 삽입
                try
                {
                    using (StreamReader sr = new StreamReader(this.except_filePath))
                    {
                        string line;
                        while ((line = sr.ReadLine()) != null)
                        {
                            if(!string.IsNullOrWhiteSpace(line))
                            {
                                line = line.Trim();     // 공백제거
                                except_keyword_list.Items.Add(line);   // 리스트박스에 아이템 추가
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("파일을 읽는 동안 오류가 발생했습니다." + ex.Message);
                    LogMessage("파일을 읽는 동안 오류가 발생했습니다.");
                }
            }
        }

        private void Manage_subscription(object sender, EventArgs e)
        {
            // 구독 관리 페이지로 이동
            Process.Start(new ProcessStartInfo
            {
                FileName = "https://www.naver.com",
                UseShellExecute = true
            });
            
        }

        private void Manage_MyPage(object sender, EventArgs e)
        {
            // 마이페이지 페이지로 이동
            Process.Start(new ProcessStartInfo
            {
                FileName = "https://www.naver.com",
                UseShellExecute = true
            });

        }

        private void Get_QnA(object sender, EventArgs e)
        {
            // 구독 관리 페이지로 이동
            Process.Start(new ProcessStartInfo
            {
                FileName = "https://www.naver.com",
                UseShellExecute = true
            });

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
            public string SelectedTimerOption { get; set; }
            public string TargetURL { get; set; }
        }
        // 입력란 내용 저장
        private void save_data(object sender, EventArgs e)
        {
            // 입력란 내용으로 입력폼 생성
            var data = new InputData
            {
                ID = this.id_input.Text,
                PW = this.pw_input.Text,
                ExtractKeywords = this.extract_keyword_list.Items.Cast<string>().ToList(),
                ExceptKeywords = this.except_keyword_list.Items.Cast<string>().ToList(),
                SelectedSortOption = this.option_panel_1.Controls.OfType<RadioButton>().FirstOrDefault(r => r.Checked).Text,
                SelectedDateOption = this.option_panel_2.Controls.OfType<RadioButton>().FirstOrDefault(r => r.Checked).Text,
                StartDate = this.start_date_str,
                EndDate = this.end_date_str,
                StartPage = this.start_page.Text,
                EndPage = this.end_page.Text,
                SelectedSaveOption = this.option_panel_3.Controls.OfType<RadioButton>().FirstOrDefault(r => r.Checked).Text,
                SelectedTimerOption = this.timeBox.Text,
                TargetURL = this.target_url_input.Text
            };

            // JSON 형식으로 저장
            save_data_to_json(data);
        }

        // JSON 파일 저장 함수
        private void save_data_to_json(InputData data)
        {
            try {
                string json = JsonConvert.SerializeObject(data, Formatting.Indented);
                string path = "input_data.json";
                File.WriteAllText(path, json);
                MessageBox.Show("입력 내용이 성공적으로 저장되었습니다.");
            }
            catch(Exception ex)
            {
                Console.WriteLine("입력 내용 저장 도중 에러가 발생하였습니다." + ex.Message);
                LogMessage("입력 내용 저장 도중 에러가 발생하였습니다.");
            }
            
        }

        // 저장 데이터를 불러오는 함수
        private void load_data_from_json()
        {

           try
            {
                string path = "input_data.json";
                string json = File.ReadAllText(path);
                InputData data = JsonConvert.DeserializeObject<InputData>(json);

                // 입력란 초기화
                this.id_input.Text = data.ID;
                this.pw_input.Text = data.PW;
                this.extract_keyword_list.Items.Clear();
                this.except_keyword_list.Items.Clear();
                this.extract_keyword_list.Items.AddRange(data.ExtractKeywords.ToArray());
                this.except_keyword_list.Items.AddRange(data.ExceptKeywords.ToArray());
                this.start_date_str = data.StartDate;
                this.end_date_str = data.EndDate;
                this.start_page.Text = data.StartPage;
                this.end_page.Text = data.EndPage;
                this.target_url_input.Text = data.TargetURL;

                // 정렬 옵션 설정
                foreach (RadioButton radio in this.option_panel_1.Controls.OfType<RadioButton>())
                {
                    if (radio.Text == data.SelectedSortOption)
                    {
                        radio.Checked = true;
                    }
                }

                // 기간 옵션 설정
                foreach (RadioButton radio in this.option_panel_2.Controls.OfType<RadioButton>())
                {
                    if (radio.Text == data.SelectedDateOption)
                    {
                        radio.Checked = true;
                    }
                }

                // 저장 방식 설정
                foreach (RadioButton radio in this.option_panel_3.Controls.OfType<RadioButton>())
                {
                    if (radio.Text == data.SelectedSaveOption)
                    {
                        radio.Checked = true;
                    }
                }

                // 타겟 URL 설정
                foreach (RadioButton radio in this.target_url_panel.Controls.OfType<RadioButton>())
                {
                    if (radio.Text == data.TargetURL)
                    {
                        radio.Checked = true;
                    }
                }

                MessageBox.Show("입력 내용을 성공적으로 로드했습니다.");
            }
            catch (Exception ex)
            {
                Console.WriteLine("입력 내용 불러오기 도중 에러가 발생하였습니다." + ex.Message);
                LogMessage("입력 내용 불러오기 도중 에러가 발생하였습니다.");
            }
        }

        // 입력란 초기화
        private void reset_data(object sender, EventArgs e)
        {
            this.id_input.Clear();
            this.pw_input.Clear();
            this.extract_keyword_list.Items.Clear();
            this.except_keyword_list.Items.Clear();
            this.extract_id_list.Clear();
            this.extract_filePath = "";
            this.except_filePath = "";
            this.target_url = "";
            this.target_url_type = "";     // 카페 or 게시판 주소인지 체크
            this.is_login_success = false;
            this.start_date_str = "";
            this.end_date_str = "";
            this.extract_id_list = new List<string>();
            this.extract_db_list = new List<List<string>>();
            this.extract_nickname_list = new List<string>();

            // DB정보 추출 비활성화
            this.extract_db_btn.Enabled = false;

            // 관련도순 라디오버튼 체크
            RadioButton default_sort_radio = option_panel_1.Controls.OfType<RadioButton>().LastOrDefault();

            if (default_sort_radio != null)
            {
                default_sort_radio.Checked = true;
            }

            // 기간(전체) 설정
            RadioButton default_date_radio = option_panel_2.Controls.OfType<RadioButton>().LastOrDefault();

            if (default_date_radio != null)
            {
                default_date_radio.Checked = true;
            }

            // 페이지 설정 초기화
            this.start_page.Text = "1";
            this.end_page.Text = "5";

            // 저장 방식 초기화
            RadioButton default_save_radio = option_panel_3.Controls.OfType<RadioButton>().LastOrDefault();

            if (default_save_radio != null)
            {
                default_save_radio.Checked = true;
            }

            // 타겟 URL 설정 초기화
            this.target_url_input.Clear();
            
            RadioButton default_target_url_radio = target_url_panel.Controls.OfType<RadioButton>().LastOrDefault();

            if(default_target_url_radio != null)
            {
                default_target_url_radio.Checked = true;
            }

            // 로그 초기화
            this.log_text.Clear();
        }
    }
}
