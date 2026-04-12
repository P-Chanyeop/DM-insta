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
using Avalonia.Controls.Primitives;

namespace NaverWriting;

public partial class NaverWritingOptionPopup : Window
{
    NaverWritingWindow.OptionTask options;
    NaverWritingWindow writingWindow;
    HttpClientHandler handler = new HttpClientHandler();
    HttpClient client;

    Dictionary<string,string> category1 = new Dictionary<string, string>();
    Dictionary<string, string> category2 = new Dictionary<string, string>();
    Dictionary<string, string> category3 = new Dictionary<string, string>();

    string selectedProductStatus = "";
    string selectedProductDelivery = "";
    string selectedProductPayment = "";
    bool IsDisplayPhoneNumber = false;

    public NaverWritingOptionPopup()
    {
    }

    public NaverWritingOptionPopup(NaverWritingWindow writingWindow, NaverWritingWindow.OptionTask options)
    {
        this.InitializeComponent();
        this.options = options;

        this.writingWindow = writingWindow;

        this.Find<CheckBox>("IsPrivatePhoneNumber").IsChecked = options.IsPrivatePhoneNumber;
        this.Find<CheckBox>("IsForeverLoop").IsChecked = options.IsForeverLoop;
        this.Find<CheckBox>("IsAutoDelete").IsChecked = options.IsAutoDelete;

        if (options.RepImagePosition == "상단")
        {
            this.Find<RadioButton>("RepImagePositionRadioButton").IsChecked = true;
            this.Find<RadioButton>("RepImagePositionRadioButton2").IsChecked = false;
        }
        else
        {
            this.Find<RadioButton>("RepImagePositionRadioButton").IsChecked = false;
            this.Find<RadioButton>("RepImagePositionRadioButton2").IsChecked = true;
        }

        this.Find<TextBox>("LoopTimes").Text = options.LoopTimes.ToString();

        // 카테고리 설정
        this.Find<ComboBox>("CategoryComboBox1").Items.Add("선택안함");
        this.Find<ComboBox>("CategoryComboBox2").Items.Add("선택안함");
        this.Find<ComboBox>("CategoryComboBox3").Items.Add("선택안함");


        LoadRootCategory();

        // 2024-12-03 TO-DO : 옵션 설정
        if (options.ProductStatus == "미개봉")
        {
            this.Find<ToggleButton>("ProductStatusToggle1").IsChecked = true;
        }
        else if (options.ProductStatus == "거의 새 것")
        {
            this.Find<ToggleButton>("ProductStatusToggle2").IsChecked = true;
        }
        else if (options.ProductStatus == "사용감 있음")
        {
            this.Find<ToggleButton>("ProductStatusToggle3").IsChecked = true;
        }

        if (options.ProductDelivery == "직거래")
        {
            this.Find<ToggleButton>("ProductDeliveryToggle1").IsChecked = true;
        }
        else if (options.ProductDelivery == "택배 거래")
        {
            this.Find<ToggleButton>("ProductDeliveryToggle2").IsChecked = true;
        }
        else if (options.ProductDelivery == "온라인 전송")
        {
            this.Find<ToggleButton>("ProductDeliveryToggle3").IsChecked = true;
        }

        if (options.Interval == 0)
        {
            this.Find<TextBox>("WaitTime").Text = "1";
        }
        else
        {
            this.Find<TextBox>("WaitTime").Text = options.Interval.ToString();
        }

        if (options.ProductSafePayment == "N 안전결제")
        {
            this.Find<ToggleButton>("ProductSafePayment1").IsChecked = true;
        }
        else if (options.ProductSafePayment == "N 일반송금")
        {
            this.Find<ToggleButton>("ProductSafePayment2").IsChecked = true;
        }
        else if (options.ProductSafePayment == "선택해제")
        {
            this.Find<ToggleButton>("ProductSafePayment3").IsChecked = true;
        }

        if (options.DisplayPhoneNumber == true)
        {
            this.Find<RadioButton>("DiplayPhoneNumberButton1").IsChecked = true;
        }
        else
        {
            this.Find<RadioButton>("DiplayPhoneNumberButton2").IsChecked = true;
        }

    }

    public void InitializeComponent()
    {
        AvaloniaXamlLoader.Load(this);
    }

    // 1차 카테고리 로드
    public async void LoadRootCategory()
    {
        client = new HttpClient(handler); 

        string url = "https://apis.naver.com/cafe-web/cafe-add-api/v1.0/categories/root?used=true";

        try
        {
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            // JSON 응답 받기
            var jsonResponse = await response.Content.ReadAsStringAsync();

            // JSON 파싱
            var jsonData = JObject.Parse(jsonResponse);
            var result = jsonData["result"];
            var categoryList = result["productCategoryList"];

            foreach (var category in categoryList)
            {
                string categoryID = category["categoryId"].ToString();
                string categoryName = category["categoryName"].ToString();
                
                category1.Add(categoryName, categoryID);

                // 콤보박스에 추가
                this.Find<ComboBox>("CategoryComboBox1").Items.Add(categoryName);
            }

            if (!string.IsNullOrEmpty(options.Category1))
            {
                this.Find<ComboBox>("CategoryComboBox1").SelectedItem = options.Category1;
            }
        }
        catch (Exception ex)
        {
            writingWindow.AddLog("1카테고리 로드 중 에러가 발생하였습니다.");
        }
    }

    public async void SelectRootCategory(object sender, SelectionChangedEventArgs e)
    {
        var comboBox = sender as ComboBox;

        // Items가 비어있을 경우 처리
        if (comboBox?.Items?.Count == 0)
        {
            return; // 이벤트 종료
        }

        var selectedCategoryName = this.Find<ComboBox>("CategoryComboBox1").SelectedItem?.ToString();

        // 2,3차 콤보박스 초기화
        category2.Clear();
        category3.Clear();
        var categoryComboBox2 = this.Find<ComboBox>("CategoryComboBox2");
        var categoryComboBox3 = this.Find<ComboBox>("CategoryComboBox3");
 
        if (selectedCategoryName == "선택안함")
        {
            // "선택안함" 항목을 선택
            categoryComboBox2.Items.Clear();
            categoryComboBox3.Items.Clear();
            categoryComboBox2.Items.Add("선택안함");
            categoryComboBox3.Items.Add("선택안함");

            categoryComboBox2.SelectedItem = "선택안함";
            categoryComboBox3.SelectedItem = "선택안함";

            return;
        }

        var selectedRootCategory = category1[selectedCategoryName];

        if (selectedRootCategory != null)
        {
            categoryComboBox2.Items.Clear();
            categoryComboBox3.Items.Clear();
            categoryComboBox2.Items.Add("선택안함");
            categoryComboBox3.Items.Add("선택안함");
            await LoadSub2Category(selectedRootCategory);
        }
        else
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "1차 카테고리를 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }
    }

    public async void SelectSub2Category(object sender, SelectionChangedEventArgs e)
    {
        var comboBox = sender as ComboBox;

        // Items가 비어있을 경우 처리
        if (comboBox?.Items?.Count == 0)
        {
            return; // 이벤트 종료
        }

        category3.Clear();

        // 3차 콤보박스 초기화
        this.Find<ComboBox>("CategoryComboBox3").Items.Clear();
        this.Find<ComboBox>("CategoryComboBox3").Items.Add("선택안함");

        var selectedCategoryName = this.Find<ComboBox>("CategoryComboBox2").SelectedItem?.ToString();

        if (selectedCategoryName == "선택안함")
        {
            return;
        }

        var selectedSub2Category = category2[selectedCategoryName];
        if (selectedSub2Category != null)
        {
            await LoadSub3Category(selectedSub2Category);
        }
        else
        {
            var messageBox = MessageBoxManager.GetMessageBoxStandard("오류", "2차 카테고리를 선택해주세요.", ButtonEnum.Ok);
            await messageBox.ShowWindowDialogAsync(this);
            return;
        }
    }

    public async Task LoadSub2Category(string category1)
    {
        var parentID = category1;

        client = new HttpClient(handler);

        string url = $"https://apis.naver.com/cafe-web/cafe-add-api/v1.0/categories/{parentID}/child?used=true";

        try
        {
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            // JSON 응답 받기
            var jsonResponse = await response.Content.ReadAsStringAsync();

            // JSON 파싱
            var jsonData = JObject.Parse(jsonResponse);
            var result = jsonData["result"];
            var categoryList = result["productCategoryList"];

            foreach (var category in categoryList)
            {
                string categoryID = category["categoryId"].ToString();
                string categoryName = category["categoryName"].ToString();
                category2.Add(categoryName, categoryID);

                // 콤보박스에 추가
                this.Find<ComboBox>("CategoryComboBox2").Items.Add(categoryName);
            }

            if (!string.IsNullOrEmpty(options.Category2))
            {
                this.Find<ComboBox>("CategoryComboBox2").SelectedItem = options.Category2;
            }
        }
        catch (Exception ex)
        {
            writingWindow.AddLog("2차 카테고리 로드 중 에러가 발생하였습니다.");
        }
    }

    public async Task LoadSub3Category(string category2)
    {
        var parentID = category2;

        client = new HttpClient(handler);

        string url = $"https://apis.naver.com/cafe-web/cafe-add-api/v1.0/categories/{parentID}/child?used=true";

        try
        {
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            // JSON 응답 받기
            var jsonResponse = await response.Content.ReadAsStringAsync();

            // JSON 파싱
            var jsonData = JObject.Parse(jsonResponse);
            var result = jsonData["result"];
            var categoryList = result["productCategoryList"];

            foreach (var category in categoryList)
            {
                string categoryID = category["categoryId"].ToString();
                string categoryName = category["categoryName"].ToString();
                category3.Add(categoryName, categoryID);

                // 콤보박스에 추가
                this.Find<ComboBox>("CategoryComboBox3").Items.Add(categoryName);
            }

            if (!string.IsNullOrEmpty(options.Category3))
            {
                this.Find<ComboBox>("CategoryComboBox3").SelectedItem = options.Category3;
            }
        }
        catch (Exception ex)
        {
            writingWindow.AddLog("3카테고리 로드 중 에러가 발생하였습니다.");
        }
    }

    // 상품 상태 버튼 상태변경
    public async void SelectProductStatus(object sender, RoutedEventArgs e)
    {
        var toggleButton1 = this.Find<ToggleButton>("ProductStatusToggle1");
        var toggleButton2 = this.Find<ToggleButton>("ProductStatusToggle2");
        var toggleButton3 = this.Find<ToggleButton>("ProductStatusToggle3");

        /*if (toggleButton1.IsChecked == true)
        {
            toggleButton1.IsChecked = true;
            toggleButton2.IsChecked = false;
            toggleButton3.IsChecked = false;

            selectedProductStatus = "미개봉";
        }
        if(toggleButton2.IsChecked == true)
        {
            toggleButton1.IsChecked = false;
            toggleButton2.IsChecked = true;
            toggleButton3.IsChecked = false;

            selectedProductStatus = "거의 새 것";
        }
        if(toggleButton3.IsChecked == true)
        {
            toggleButton1.IsChecked = false;
            toggleButton2.IsChecked = false;
            toggleButton3.IsChecked = false;

            selectedProductStatus = "사용감 있음";
        }*/
        // 이벤트 등록
        toggleButton1.IsCheckedChanged += (sender, e) =>
        {
            if (toggleButton2.IsChecked == true || toggleButton3.IsChecked == true)
            {
                toggleButton2.IsChecked = false;
                toggleButton3.IsChecked = false;

            }
            selectedProductStatus = "미개봉";
        };

        toggleButton2.IsCheckedChanged += (sender, e) =>
        {
            if (toggleButton1.IsChecked == true || toggleButton3.IsChecked == true)
            {
                toggleButton1.IsChecked = false;
                toggleButton3.IsChecked = false;

            }
            selectedProductStatus = "거의 새 것";
        };

        toggleButton3.IsCheckedChanged += (sender, e) =>
        {
            if (toggleButton1.IsChecked == true || toggleButton2.IsChecked == true)
            {
                toggleButton1.IsChecked = false;
                toggleButton2.IsChecked = false;

            }
            selectedProductStatus = "사용감 있음";
        };
    }

    // 배송 방법 버튼 상태변경
    public async void SelectProductDelivery(object sender, RoutedEventArgs e)
    {
        var toggleButton1 = this.Find<ToggleButton>("ProductDeliveryToggle1");
        var toggleButton2 = this.Find<ToggleButton>("ProductDeliveryToggle2");
        var toggleButton3 = this.Find<ToggleButton>("ProductDeliveryToggle3");
        /*if (toggleButton1.IsChecked == true)
        {
            toggleButton2.IsChecked = false;
            toggleButton3.IsChecked = false;

            selectedProductDelivery = "직거래";
        }
        if (toggleButton2.IsChecked == true)
        {
            toggleButton1.IsChecked = false;
            toggleButton3.IsChecked = false;

            selectedProductDelivery = "택배 거래";
        }
        if (toggleButton3.IsChecked == true)
        {
            toggleButton1.IsChecked = false;
            toggleButton2.IsChecked = false;

            selectedProductDelivery = "온라인 전송";
        }
*/
        // 이벤트 등록
        toggleButton1.IsCheckedChanged += (sender, e) =>
        {
            if (toggleButton2.IsChecked == true || toggleButton3.IsChecked == true)
            {
                toggleButton2.IsChecked = false;
                toggleButton3.IsChecked = false;

            }
            selectedProductDelivery = "직거래";
        };

        toggleButton2.IsCheckedChanged += (sender, e) =>
        {
            if (toggleButton1.IsChecked == true || toggleButton3.IsChecked == true)
            {
                toggleButton1.IsChecked = false;
                toggleButton3.IsChecked = false;

            }
            selectedProductDelivery = "택배 거래";
        };

        toggleButton3.IsCheckedChanged += (sender, e) =>
        {
            if (toggleButton1.IsChecked == true || toggleButton2.IsChecked == true)
            {
                toggleButton1.IsChecked = false;
                toggleButton2.IsChecked = false;
            }
            selectedProductDelivery = "온라인 전송";
        };
    }

    // 안전결제 방법 버튼 상태변경
    public async void SelectProductPayment(object sender, RoutedEventArgs e)
    {
        var toggleButton1 = this.Find<ToggleButton>("ProductSafePayment1");
        var toggleButton2 = this.Find<ToggleButton>("ProductSafePayment2");
        var toggleButton3 = this.Find<ToggleButton>("ProductSafePayment3");

        // 이벤트 등록
        toggleButton1.IsCheckedChanged += (sender, e) =>
        {
            if (toggleButton2.IsChecked == true || toggleButton3.IsChecked == true)
            {
                toggleButton2.IsChecked = false;
                toggleButton3.IsChecked = false;

            }
            selectedProductPayment = "N 안전거래";
        };

        toggleButton2.IsCheckedChanged += (sender, e) =>
        {
            if (toggleButton1.IsChecked == true || toggleButton3.IsChecked == true)
            {
                toggleButton1.IsChecked = false;
                toggleButton3.IsChecked = false;

                
            }
            selectedProductPayment = "N 일반송금";
        };

        toggleButton3.IsCheckedChanged += (sender, e) =>
        {
            if (toggleButton1.IsChecked == true || toggleButton2.IsChecked == true)
            {
                toggleButton1.IsChecked = false;
                toggleButton2.IsChecked = false;

                
            }
            selectedProductPayment = "선택해제";
        };
    }

    public async void OnSaveButtonClick(object sender, RoutedEventArgs e)
    {
        // 현재 선택된 RadioButton 가져오기
        var selectedRadioButton = new[] {
            this.Find<RadioButton>("RepImagePositionRadioButton"),
            this.Find<RadioButton>("RepImagePositionRadioButton2")
        }.FirstOrDefault(rb => rb.IsChecked == true);

        options.IsPrivatePhoneNumber = this.Find<CheckBox>("IsPrivatePhoneNumber").IsChecked.Value;
        options.IsForeverLoop = this.Find<CheckBox>("IsForeverLoop").IsChecked.Value;
        options.IsAutoDelete = this.Find<CheckBox>("IsAutoDelete").IsChecked.Value;
        options.RepImagePosition = selectedRadioButton?.Content.ToString() ?? "상단";
        options.LoopTimes = int.Parse(this.Find<TextBox>("LoopTimes").Text);
        options.Interval = int.Parse(this.Find<TextBox>("WaitTime").Text);
        options.Category1 = this.Find<ComboBox>("CategoryComboBox1").SelectedItem?.ToString() ?? "";
        options.Category2 = this.Find<ComboBox>("CategoryComboBox2").SelectedItem?.ToString() ?? "";
        options.Category3 = this.Find<ComboBox>("CategoryComboBox3").SelectedItem?.ToString() ?? "";
        options.ProductStatus = selectedProductStatus?? "";
        options.ProductDelivery = selectedProductDelivery ?? "";
        options.ProductSafePayment = selectedProductPayment ?? "";

        selectedRadioButton = new[] {
            this.Find<RadioButton>("DiplayPhoneNumberButton1"),
            this.Find<RadioButton>("DiplayPhoneNumberButton2")
        }.FirstOrDefault(rb => rb.IsChecked == true);
        options.DisplayPhoneNumber = selectedRadioButton.IsChecked.Value;

        this.Close(options); // 팝업 종료 시 데이터를 반환
    }
}