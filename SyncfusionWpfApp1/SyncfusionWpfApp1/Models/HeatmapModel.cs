using System;
using System.Collections.ObjectModel;
using System.Globalization;

using Syncfusion.Windows.Shared;

using SyncfusionWpfApp1.Contracts.Services;

namespace SyncfusionWpfApp1.Model
{
    public class HeadMapModel : NotificationObject
    {
        public string EmployeeName { get; set; }
        public double January { get; set; }
        public double February { get; set; }
        public double March { get; set; }
        public double April { get; set; }
        public double May { get; set; }
        public double June { get; set; }
        public double July { get; set; }
        public double August { get; set; }
        public double September { get; set; }
        public double October { get; set; }
        public double November { get; set; }
        public double December { get; set; }

        public HeadMapModel()
        {

        }
    }
}
