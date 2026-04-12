using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Windows.Media;

using Syncfusion.UI.Xaml.Scheduler;
using Syncfusion.Windows.Shared;

using SyncfusionWpfApp1.Contracts.Services;
using SyncfusionWpfApp1.Helpers;
using SyncfusionWpfApp1.Models;

namespace SyncfusionWpfApp1.ViewModels
{
    public class SchedulerViewModel : Observable
    {
		private ObservableCollection<object> resources;

        public ObservableCollection<object> Resources
        {
            get
            {
                return resources;
            }
            set
            {
                resources = value;
                RaisePropertyChanged("Resources");
            }
        }
		
        public SchedulerViewModel()
        {
            MinDate = DateTime.Now.Date.AddMonths(-3);
            MaxDate = DateTime.Now.AddMonths(3);
            DisplayDate = DateTime.Now.Date.AddHours(9);
			
			Resources = new ObservableCollection<object>()
			{
			new SchedulerResource() { Name = "Sophia", Foreground= new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF")), Background =  new SolidColorBrush((Color)ColorConverter.ConvertFromString("#9d65c9")), Id = "1000" },
			new SchedulerResource() { Name = "Zoey Addison", Foreground= new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF")),Background =  new SolidColorBrush((Color)ColorConverter.ConvertFromString("#f08a5d")), Id = "1001" },
			new SchedulerResource() { Name = "James William",Foreground= new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF")), Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#679b9b")), Id = "1002" },
			};

            //Creating new event   
            Events = new ScheduleAppointmentCollection();

            //Creating new event   
            this.Events.Add(new ScheduleAppointment()
            {
                StartTime = DateTime.Now,
                EndTime = DateTime.Now.AddHours(1),
                AppointmentBackground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FF339933")),
                Subject = "Conference",
                Reminders = new ObservableCollection<SchedulerReminder>
                {
                     new SchedulerReminder { ReminderTimeInterval = new TimeSpan(0)},
                },
				ResourceIdCollection = new ObservableCollection<object> { (Resources[1] as SchedulerResource).Id }
            });
        }

        private ScheduleAppointmentCollection events;


        public DateTime MinDate { get; set; }
        public DateTime MaxDate { get; set; }
        public DateTime DisplayDate { get; set; }
        public ScheduleAppointmentCollection Events
        {
            get { return events; }
            set
            {
                events = value;
                RaisePropertyChanged("Events");
            }
        }
    }
}
