using System;
using System.Windows.Controls;

namespace SyncfusionWpfApp1.Contracts.Services
{
    public interface IPageService
    {
        Type GetPageType(string key);

        Page GetPage(string key);
    }
}
