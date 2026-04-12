using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Windows.Media;

using Syncfusion.Windows.Shared;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.Model;

namespace SyncfusionWpfApp1.ViewModels
{
    public class AutoCompleteViewModel : Observable
    {
		private List<AutoComplete> employees;
        public List<AutoComplete> Employees
        {
            get { return employees; }

            set { employees = value; }
        }
        public AutoCompleteViewModel()
        {
            Employees = new List<AutoComplete>();
            Employees.Add(new AutoComplete() { Name = "Eric", Email = "Eric@syncfusion.com" });
            Employees.Add(new AutoComplete() { Name = "James", Email = "James@syncfusion.com" });
            Employees.Add(new AutoComplete() { Name = "Jacob", Email = "Jacob@syncfusion.com" });
            Employees.Add(new AutoComplete() { Name = "Lucas", Email = "Lucas@syncfusion.com" });
            Employees.Add(new AutoComplete() { Name = "Mark", Email = "Mark@syncfusion.com" });
            Employees.Add(new AutoComplete() { Name = "Aldan", Email = "Aldan@syncfusion.com" });
            Employees.Add(new AutoComplete() { Name = "Aldrin", Email = "Aldrin@syncfusion.com" });
            Employees.Add(new AutoComplete() { Name = "Alan", Email = "Alan@syncfusion.com" });
            Employees.Add(new AutoComplete() { Name = "Aaron", Email = "Aaron@syncfusion.com" });
        }
    }
}
