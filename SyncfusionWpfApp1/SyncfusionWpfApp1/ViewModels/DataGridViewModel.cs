using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Contracts.ViewModels;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1.ViewModels
{
    public class DataGridViewModel : Observable
    {
        #region Constructor
        /// <summary>
        /// Initializes a new instance of the <see cref="DataGridViewModel"/> class.
        /// </summary>
        public DataGridViewModel()
        {
            Gender = new List<string>();
            Gender.Add("Male");
            Gender.Add("Female");

			Trustworthiness = new List<string>();
            Trustworthiness.Add("Sufficient");
            Trustworthiness.Add("Insufficient");
            Trustworthiness.Add("Perfect");
            EmployeeDetails = GetEmployeeDetails(50);
        }

        #endregion

        #region Properties
		
		public List<string> Trustworthiness { get; set; }

        private ObservableCollection<Employee> _employeeDetails = new ObservableCollection<Employee>();

        public ObservableCollection<Employee> EmployeeDetails
        {
            get { return _employeeDetails; }
            set { _employeeDetails = value; }
        }
        public List<string> Gender { get; set; }
        #endregion

        #region Method

        public ObservableCollection<Employee> GetEmployeeDetails(int count)
        {
            Random random = new Random();
            ObservableCollection<Employee> ordersDetails = new ObservableCollection<Employee>();

            for (int i = 10000; i < count + 10000; i++)
            {
                var name = employees[random.Next(25)];
                int index = Array.IndexOf(employees, name);
                string genders = Gender[gender[index]];
                ordersDetails.Add(new Employee(name, designation[random.Next(6)], name.ToLower() + "@" + mail[random.Next(4)], location[random.Next(8)], trust[random.Next(3)], random.Next(1, 5), random.Next(100000, 400000), address[random.Next(1, 25)], genders));
            }

            return ordersDetails;
        }
        #endregion

        #region Collections

        string[] employees = { "Michael", "Kathryn", "Tamer", "Martin", "Davolio", "Nancy", "Fuller", "Leverling", "Therasa",
        "Margaret", "Buchanan", "Janet", "Andrew", "Callahan", "Laura", "Dodsworth", "Anne",
        "Bergs", "Vinet", "Anto", "Fleet", "Zachery", "Van", "Edward", "Jack", "Rose"};
        int[] gender = { 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1};
        string[] designation = { "Manager", "CFO", "Designer", "Developer", "Program Directory", "System Analyst", "Project Lead" };
        string[] mail = { "arpy.com", "sample.com", "rpy.com", "jourrapide.com" };
        string[] trust = { "Sufficient", "Perfect", "Insufficient" };
        string[] location = { "UK", "USA", "Sweden", "France", "Canada", "Argentina", "Austria", "Germany", "Mexico" };
        string[] address = {"59 rue de lAbbaye", "Luisenstr. 48"," Rua do Paço 67", "2 rue du Commerce", "Boulevard Tirou 255",
        "Rua do mailPaço 67", "Hauptstr. 31", "Starenweg 5", "Rua do Mercado, 12",
        "Carrera 22 con Ave."," Carlos Soublette #8-35", "Kirchgasse 6",
        "Sierras de Granada 9993", "Mehrheimerstr. 369", "Rua da Panificadora 12", "2817 Milton Dr.", "Kirchgasse 6",
        "Åkergatan 24", "24, place Kléber", "Torikatu 38", "Berliner Platz 43", "5ª Ave. Los Palos Grandes", "1029 - 12th Ave. S.",
        "Torikatu 38", "P.O. Box 555", "2817 Milton Dr.", "Taucherstraße 10", "59 rue de lAbbaye", "Via Ludovico il Moro 22",
        "Avda. Azteca 123", "Heerstr. 22", "Berguvsvägen  8", "Magazinweg 7", "Berguvsvägen  8", "Gran Vía, 1", "Gran Vía, 1",
        "Carrera 52 con Ave. Bolívar #65-98 Llano Largo", "Magazinweg 7", "Taucherstraße 10", "Taucherstraße 10"};

        #endregion
    }
}
