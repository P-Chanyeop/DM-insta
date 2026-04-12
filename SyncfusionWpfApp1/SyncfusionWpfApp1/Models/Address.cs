using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SyncfusionWpfApp1
{
    public class Address
    {
        [Display(Description = "State where the employee home is located")]
        public string State { get; set; }

        [Display(Description = "StreetName where the employee home is located")]
        public string StreetName { get; set; }

        [Display(Description = "Door number of the employee home")]
        public int DoorNo { get; set; }
        public override string ToString()
        {
            return DoorNo.ToString() + ", " + StreetName + ", " + State;
        }
    }
}
