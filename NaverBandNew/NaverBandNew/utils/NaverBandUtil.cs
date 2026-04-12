using OpenQA.Selenium;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

public static class NaverBandUtil
{
    public static async Task<List<string>> CollectBandUrls(IWebDriver driver, Action<string> logger)
    {
        List<string> urls = new();
        driver.Navigate().GoToUrl("https://auth.band.us/login_page?next_url=https%3A%2F%2Fband.us%2Fhome");

        logger("로그인 페이지 접속 완료. 로그인 후 계속 진행합니다.");
        while (!driver.PageSource.Contains("내 밴드")) await Task.Delay(1000);

        var doc = new HtmlAgilityPack.HtmlDocument();
        doc.LoadHtml(driver.PageSource);

        var bands = doc.DocumentNode.SelectNodes("//ul[@data-viewname='DBandCollectionView']//a");
        if (bands != null)
        {
            foreach (var a in bands)
            {
                var href = a.GetAttributeValue("href", "");
                if (!string.IsNullOrWhiteSpace(href))
                    urls.Add("https://band.us" + href);
            }
        }

        logger($"총 {urls.Count}개 밴드 수집됨");
        return urls;
    }

    public static async Task WritePost(IWebDriver driver, string bandUrl, string content, List<string> images, Action<string> logger)
    {
        try
        {
            driver.Navigate().GoToUrl(bandUrl);
            await Task.Delay(2000);

            var writeBtn = driver.FindElements(By.CssSelector("button")).FirstOrDefault(b => b.Text.Contains("글쓰기"));
            writeBtn?.Click();

            await Task.Delay(1000);
            var editor = driver.FindElements(By.ClassName("contentEditor")).Last();
            editor.SendKeys(content);

            string imageString = string.Empty;

            // 이미지 여러 개 업로드를 위해 \n으로 구분
            if (images.Count > 0)
            {
                imageString = string.Join("\n", images);  // \n으로 구분해야 여러 개 업로드됨
            }
            else
            {
                logger("이미지 없음");
                return;
            }

            try
            {
                var uploader = driver.FindElement(By.CssSelector("input[type='file'][name='attachment']"));
                uploader.SendKeys(imageString);
                await Task.Delay(2000);
            }
            catch (Exception ex)
            {
                logger($"이미지 업로드 중 오류: {ex.Message}");
            }            

            // 첨부하기 버튼 클릭
            while (true)
            {
                driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(1);
                try
                {
                    var addImageButton = driver.FindElement(By.CssSelector("._submitBtn"));
                    addImageButton.Click();
                    await Task.Delay(1000);
                    break;
                } 
                catch (Exception e)
                {
                    continue;
                }
            }

            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);
            logger("사진 첨부 완료.");

            // 사진 개수에 따라 대기 시간 조절(기본 5초 + 10 개당 1초 느낌으로)
            int waitTime = 5 + (images.Count / 10);
            await Task.Delay(waitTime * 1000);

            driver.FindElement(By.CssSelector("._btnSubmitPost")).Click();

            logger("밴드 글 작성 완료.");
        }
        catch (Exception ex)
        {
            logger($"오류 발생: {ex.Message}");
        }
    }
}
