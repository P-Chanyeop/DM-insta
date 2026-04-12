using Avalonia.Controls;
using Avalonia.Interactivity;
using Gtk;
using NaverWriting;
using System;
using System.Linq;
using System.Threading.Tasks;
using Avalonia.Media.Imaging;
using System.IO;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;
using System.Net.Http;
using System.Collections.Generic;
using Microsoft.Web.WebView2.Core;

namespace WebViewSample.Views;
public partial class MainView : UserControl
{
    string repImagePath;
    private readonly HttpClient _httpClient = new HttpClient();
    List<string> picturePaths = new List<string>();

    //private const string SERVER_URL = "https://softcat.co.kr";
    private const string SERVER_URL = "http://localhost:8080";

    public MainView()
    {
        // WebView2 GPU 옵션 적용 (중요: InitializeComponent 전에 와도 됨)
        Environment.SetEnvironmentVariable("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--disable-gpu");

        InitializeComponent();
        PART_WebView.WebViewNewWindowRequested += PART_WebView_WebViewNewWindowRequested;

        LoadHtmlContent();
        //수정
    }


    private async void LoadHtmlContent()
    {

        PART_WebView.Url = new Uri($"{SERVER_URL}/smarteditor/SmartEditor2.html");
        //PART_WebView.Url = new Uri($"file:///{Path.Combine(AppContext.BaseDirectory, "smarteditor/SamrtEditor2.html")}");

        /*await Task.Delay(5000);
        await PART_WebView.ExecuteScriptAsync("alert('Hello, WebView!');");*/
    }

    private void PART_Button_Click(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
    {
        Avalonia.Controls.Window window = new()
        {
            Height = 600,
            Width = 600
        };

        window.Show();
    }

    private void PART_WebView_WebViewNewWindowRequested(object? sender, WebViewCore.Events.WebViewNewWindowEventArgs e)
    {
        e.UrlLoadingStrategy = WebViewCore.Enums.UrlRequestStrategy.OpenInNewWindow;
    }

    public async void UploadPicture(object sender, RoutedEventArgs e)
    {
        // MainView의 Parent Window 참조 가져오기
        var window = this.VisualRoot as Avalonia.Controls.Window;
        if (window == null)
            return;

        // 이미지 파일 선택
        var dialog = new OpenFileDialog();
        dialog.AllowMultiple = true;
        dialog.Filters.Add(new FileDialogFilter() { Name = "Images", Extensions = { "jpg", "png", "bmp" } });
        var result = await dialog.ShowAsync(window);

        if (result != null)
        {
            var files = result.Select(x => x);
            foreach (var file in files)
            {
                string fileName = file.Split("\\").Last();
                string filePath = file.Replace("\\", "/");

                // TEXT_EDITOR에 이미지 추가
                // /dist/img/ko_KR/avalonia-logo.ico

                // 서버 내 temp 폴더 내에 이미지를 저장
                // 서버에 파일 업로드
                var base64String = await UploadFileToServer(filePath);

                // 서버 URL을 WebView에 삽입
                if (!string.IsNullOrEmpty(base64String))
                {
                    InsertImageInEditor(base64String);
                }
                /*string script = $"""
                    var sHTML = "<img src='{filePath}'><\/img>";
                    oEditors.getById["ir1"].exec("PASTE_HTML", [sHTML]);
                    """;

                await PART_WebView.ExecuteScriptAsync(script);*/

                picturePaths.Add(filePath);
            }
        }
    }

    // 서버에 파일 업로드
    private async Task<string> UploadFileToServer(string filePath)
    {
        using (var form = new MultipartFormDataContent())
        {
            var fileContent = new ByteArrayContent(await File.ReadAllBytesAsync(filePath));
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
            form.Add(fileContent, "file", Path.GetFileName(filePath));

            var response = await _httpClient.PostAsync($"{SERVER_URL}/api/class/upload", form);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var jsonResponse = JObject.Parse(responseContent);
                return jsonResponse["base64"]?.ToString();
            }
            else
            {
                Console.WriteLine("파일 업로드 실패");
                return string.Empty;
            }
        }
    }

    private async void InsertImageInEditor(string base64)
    {
        // WebView에 HTML로 이미지 삽입
        /*string script = $"""
            var sHTML = "<img src='{fileUrl}'>";
            oEditors.getById["ir1"].exec("PASTE_HTML", [sHTML]);
            """;*/
        string script = $"""
        var sHTML = "<img src='{base64}'>";
        oEditors.getById["ir1"].exec("PASTE_HTML", [sHTML]);
        """;

        await PART_WebView.ExecuteScriptAsync(script);
    }

    public async void UploadRepPic(object sender, RoutedEventArgs e)
    {
        var window = this.VisualRoot as Avalonia.Controls.Window;
        if (window == null)
            return;

        var dialog = new OpenFileDialog();
        dialog.AllowMultiple = true;
        dialog.Filters.Add(new FileDialogFilter() { Name = "Images", Extensions = { "jpg", "png", "bmp" } });
        var result = await dialog.ShowAsync(window);

        //if (result != null && result.Length >= 1)
        //{
        //    ButtonText.Text = "등록 완료"; // 버튼 텍스트 변경
        //    CheckImage.IsVisible = true; // 체크 이미지 표시
        //    repImagePath = result[0]; // 대표 이미지 경로 저장
        //}
        //else
        //{
        //    ButtonText.Text = "등록하기";
        //    CheckImage.IsVisible = false;
        //}
    }

    private void PreviewImageButton_Click(object sender, RoutedEventArgs e)
    {
        string imagePath = repImagePath;
        if (imagePath != null)
        {
            var imagePreviewPopup = new ImagePreviewPopup(imagePath);
            imagePreviewPopup.Show();
        }
    }

    public async Task<List<string>> UploadArticle(object sender, RoutedEventArgs e)
    {
        // NaverWritingwindow로 글 데이터 이동
        string content = "";

        // WebView에 있는 내용을 가져옴
        var script = """
            function showHTML(){
                var sHTML = oEditors.getById["ir1"].getIR();
                return sHTML;
            }
            showHTML();
            """;
        var result = await PART_WebView.ExecuteScriptAsync(script);

        // ExecuteScriptAsync는 문자열을 반환하므로 이를 필요에 따라 처리합니다.
        content = result?.Trim('"') ?? ""; // 결과가 null인 경우 빈 문자열 할당

        var returnContent = new List<string>();
        returnContent.Add(content);
        returnContent.Add(repImagePath);

        return returnContent;
    }

    public List<string> UploadPictures(object sender, RoutedEventArgs e)
    {
        return this.picturePaths;
    }
}