//EmployeeViewModel class added by the syncfusion
using SyncfusionWpfApp1.Model;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SyncfusionWpfApp1.ViewModel
{
    public class AutoCompleteViewModel1 
    {
		private List<AutoCompleteModel1> employees;
        public List<AutoCompleteModel1> Employees
        {
            get { return employees; }

            set { employees = value; }
        }
        public AutoCompleteViewModel1()
        {
            Employees = new List<AutoCompleteModel1>();
            Employees.Add(new AutoCompleteModel1() { Name = "Eric", Email = "Eric@syncfusion.com" });
            Employees.Add(new AutoCompleteModel1() { Name = "James", Email = "James@syncfusion.com" });
            Employees.Add(new AutoCompleteModel1() { Name = "Jacob", Email = "Jacob@syncfusion.com" });
            Employees.Add(new AutoCompleteModel1() { Name = "Lucas", Email = "Lucas@syncfusion.com" });
            Employees.Add(new AutoCompleteModel1() { Name = "Mark", Email = "Mark@syncfusion.com" });
            Employees.Add(new AutoCompleteModel1() { Name = "Aldan", Email = "Aldan@syncfusion.com" });
            Employees.Add(new AutoCompleteModel1() { Name = "Aldrin", Email = "Aldrin@syncfusion.com" });
            Employees.Add(new AutoCompleteModel1() { Name = "Alan", Email = "Alan@syncfusion.com" });
            Employees.Add(new AutoCompleteModel1() { Name = "Aaron", Email = "Aaron@syncfusion.com" });
        }
    }
}
