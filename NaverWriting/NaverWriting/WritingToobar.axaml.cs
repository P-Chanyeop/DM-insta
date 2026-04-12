using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Win32.Interop;
using System;
using System.Linq;
using Avalonia.Markup.Xaml;
using CrissCross.Avalonia;
using ReactiveUI;
using WebViewSample.Views;
using System.Threading.Tasks;
using System.Collections.Generic;
using MsBox.Avalonia.Enums;
using MsBox.Avalonia;
using ShimSkiaSharp;
using HtmlAgilityPack;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;
using System.Net.Http;
using System.IO;

namespace NaverWriting;

public partial class WritingToobar : Window
{
    string repImagePath;
    private readonly NaverWritingWindow _naverWritingWindow;
    private readonly MainView _mainWindow;
    private readonly HttpClient _httpClient = new HttpClient();
    List<string> picturePaths = new List<string>();

    private const string SERVER_URL = "https://softcat.co.kr";

    public WritingToobar()
    {
    }
    public WritingToobar(NaverWritingWindow naverWritingWindow)
    {
        InitializeComponent();
        _naverWritingWindow = naverWritingWindow;
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
                // 로컬에서 base64String 을 만들자!@
                //var base64String = await UploadFileToServer(filePath);
                // 파일에서 Base64 문자열 생성
                string base64String = Convert.ToBase64String(await File.ReadAllBytesAsync(filePath));

                // MIME 타입 추론 (확장자 기반)
                string mimeType = GetMimeTypeFromExtension(Path.GetExtension(filePath));

                // data URI 형식으로 변환
                string dataUri = $"data:{mimeType};base64,{base64String}";

                // WebView에 이미지 삽입
                if (!string.IsNullOrEmpty(dataUri))
                {
                    InsertImageInEditor(dataUri);  // WebView에 이미지 삽입
                }


                //// 서버 URL을 WebView에 삽입
                //if (!string.IsNullOrEmpty(base64String))
                //{
                //    InsertImageInEditor(base64String);
                //}
                /*string script = $"""
                    var sHTML = "<img src='{filePath}'><\/img>";
                    oEditors.getById["ir1"].exec("PASTE_HTML", [sHTML]);
                    """;

                await PART_WebView.ExecuteScriptAsync(script);*/

                picturePaths.Add(filePath);
            }
        }
    }

    // MIME 타입 추론 함수
    private string GetMimeTypeFromExtension(string extension)
    {
        return extension.ToLower() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".bmp" => "image/bmp",
            ".gif" => "image/gif",
            _ => "application/octet-stream" // fallback
        };
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

        await PART_WEBVIEW.PART_WebView.ExecuteScriptAsync(script);
    }

    //public async void UploadRepPic(object sender, RoutedEventArgs e)
    //{
    //    var dialog = new OpenFileDialog();
    //    dialog.AllowMultiple = true;
    //    dialog.Filters.Add(new FileDialogFilter() { Name = "Images", Extensions = { "jpg", "png", "bmp" } });
    //    var result = await dialog.ShowAsync(this);

    //    if (result.Length >= 1 && result != null)
    //    {
    //        ButtonText.Text = "등록 완료"; // 버튼 텍스트 변경
    //        CheckImage.IsVisible = true; // 체크 이미지 표시
    //        repImagePath = result[0]; // 대표 이미지 경로 저장
    //    }
    //    else
    //    {
    //        ButtonText.Text = "등록하기";
    //        CheckImage.IsVisible = false;
    //    }
    //}

    private void PreviewImageButton_Click(object sender, RoutedEventArgs e)
    {
        // 이미지 로드 및 미리보기 창 표시
        string imagePath = repImagePath;
        if (imagePath != null)
        {
            var imagePreviewPopup = new ImagePreviewPopup(imagePath);
            imagePreviewPopup.Show();
        }
    }

    public async Task<string> ReplaceImagePaths(string contents, List<string> newPaths)
    {
        // 1. JSON 문자열 디코딩
        string decodedString = JsonConvert.DeserializeObject<string>(@"""" + contents + @"""");

        // HTML 파싱
        var htmlDoc = new HtmlDocument();
        htmlDoc.LoadHtml(decodedString);

        // <img> 태그 추출
        var imgNodes = htmlDoc.DocumentNode.SelectNodes("//img[@src]");

        if (imgNodes == null)
            return decodedString; // <img> 태그가 없으면 원본 반환

        // src 속성 교체
        List<string> oldPaths = new List<string>();
        int index = 0;

        foreach (var imgNode in imgNodes)
        {
            // 기존 src 경로 저장
            string oldPath = imgNode.GetAttributeValue("src", string.Empty);
            oldPaths.Add(oldPath);

            // 새로운 경로로 대체 (newPaths와 매핑)
            if (index < newPaths.Count)
            {
                imgNode.SetAttributeValue("src", newPaths[index]);
                index++;
            }
        }

        // 수정된 HTML 반환
        return htmlDoc.DocumentNode.OuterHtml;
    }

    public async void UploadArticleAsync(object sender, RoutedEventArgs e)
    {
        List<string> contents = new List<string>();
        List<string> picturePaths = new List<string>();

        if (PART_WEBVIEW is MainView mainView)
        {
            contents = await mainView.UploadArticle(null, null); // 글 내용 가져오기
            picturePaths = this.picturePaths; // 이미지 경로 가져오기
        }

        // HTML img태그 변환
        contents[0] = await ReplaceImagePaths(contents[0], picturePaths);
        

        // content를 NaverWritingWindow로 전달 또는 Article객체로 변환하여 전달
        NaverWritingWindow.ArticleData articleData = new NaverWritingWindow.ArticleData();
        string title = TITLE_INPUT.Text;
        string memo = MEMO_INPUT.Text;
        string content = contents[0];
        string repImagePath = contents[1];
        string tags = TAG_INPUT.Text;
        string price = PRICE_INPUT.Text;
        bool isPublic = true;
        bool isCanSearch = true;
        string sellerName = SELLER_NAME_INPUT.Text;
        string sellerContact = SELLER_PHONENUMBER_INPUT.Text;
        string sellerPhonenumber = SELLER_PHONENUMBER_INPUT.Text;
        bool isCanScrap = true;
        bool isCanCopy = true;
        bool isCanCCL = false;

        if (title == null)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "제목은 필수값입니다. 제목을 입력해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }

        if (content == null)
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "내용은 필수값입니다. 내용을 입력해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }
        
        if (!string.IsNullOrEmpty(tags))
        {
            if (tags.Split(",").Length > 10)
            {
                var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "태그는 10개까지만 입력 가능합니다.", ButtonEnum.Ok);
                await messageBox.ShowWindowDialogAsync(this);
                return;
            }
        }

        if (PUBLIC_RADIO.IsChecked == true)
        {
            isPublic = true;
        }
        else if (PRIVATE_RADIO.IsChecked == true)
        {
            isPublic = false;
        }

        
        if (SEARCH_CHECKBOX.IsChecked == true)
        {
            isCanSearch = true;
        }
        else
        {
            isCanSearch = false;
        }

        if (SCRAP_CHECKBOX.IsChecked == true)
        {
            isCanScrap = true;
        }
        else
        {
            isCanScrap = false;
        }

        if (COPY_CHECKBOX.IsChecked == true)
        {
            isCanCopy = true;
        }
        else
        {
            isCanCopy = false;
        }

        if (CCL_CHECKBOX.IsChecked == true)
        {
            isCanCCL = true;
        }
        else
        {
            isCanCCL = false;
        }

        articleData.ArticleTitle = title;
        articleData.ArticleMemo = memo;
        articleData.ArticleContent = content;
        articleData.ArticleRepPicturePath = contents[1];
        articleData.ArticleTags = tags;
        articleData.ArticlePrice = price;
        articleData.IsArticlePublic = isPublic;
        articleData.IsArticleCanSearch = isCanSearch;
        articleData.ArticleSeller = sellerName;
        articleData.ArticleSellerEmail = sellerContact;
        articleData.ArticleSellerPhone = sellerPhonenumber;
        articleData.IsArticleCanScrap = isCanScrap;
        articleData.IsArticleCanCopy = isCanCopy;
        articleData.IsArticleCanCCL = isCanCCL;

        // NaverWritingWindow로 데이터 전달
        _naverWritingWindow.AddArticleData(articleData);

        _naverWritingWindow.SetArticlePictures(picturePaths);

        // 글 작성 창 닫기
        this.Close();
    }
}