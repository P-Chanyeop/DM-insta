using OpenQA.Selenium.Chrome;
using OpenQA.Selenium;

public static class SeleniumFactory
{
    public static IWebDriver CreateDriver()
    {
        var options = new ChromeOptions();
        options.AddArgument("--disable-gpu");
        options.AddArgument("--no-sandbox");
        options.AddArgument("--disable-notifications");
        options.AddArgument("--start-maximized");

        return new ChromeDriver(options);
    }
}
