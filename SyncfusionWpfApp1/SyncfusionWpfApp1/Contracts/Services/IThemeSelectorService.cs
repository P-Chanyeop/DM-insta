using System;

using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1.Contracts.Services
{
    public interface IThemeSelectorService
    {
        bool SetTheme(AppTheme? theme = null);

        AppTheme GetCurrentTheme();
    }
}
